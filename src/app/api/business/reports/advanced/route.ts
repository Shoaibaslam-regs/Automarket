import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Purchase } from "@/models/Purchase";
import { Booking } from "@/models/Booking";
import { Customer } from "@/models/Customer";
import { Rental } from "@/models/Rental";
import { Listing } from "@/models/Listing";
import { Deal } from "@/models/Deal";
import { User } from "@/models/User";
import { can, getBusinessRentals, getMembership } from "@/lib/business";
import { getOrgDealIds } from "@/lib/dealBookings";
import { getSubscription, subscriptionHas } from "@/lib/subscription";
import { planFor } from "@/lib/plans";
import { salePrice } from "@/lib/purchases";
import { parseReportDays } from "@/lib/advancedReport";
import { reportError } from "@/lib/errorLog";

export const dynamic = "force-dynamic";

type Oid = mongoose.Types.ObjectId;
type Totals = { salesCount: number; salesValue: number; rentalsCompleted: number; rentalIncome: number; bookingsMade: number; newCustomers: number };

/**
 * Business → Reports → Advanced reports (Ultimate, PLAN_FEATURES.advancedReports; owner and managers, since it is all
 * money): `?from=YYYY-MM-DD&to=YYYY-MM-DD` (Pakistan days, src/lib/advancedReport.ts). Totals for the range and the
 * same number of days before it, and the range broken down per vehicle, per team member, per make and by online or
 * walk-in. Sales are sale records marked sold (final price); rentals are returned bookings (rent, late fee, extras).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!can(member.role, "viewPerformance")) return NextResponse.json({ error: "Only the owner or a manager can see advanced reports" }, { status: 403 });
    const sub = await getSubscription(session.user.id);
    if (!subscriptionHas(sub, "advancedReports")) {
      return NextResponse.json({ error: `Advanced reports are on ${planFor("advancedReports").name}`, code: "PLAN_FEATURE", plan: planFor("advancedReports").name }, { status: 403 });
    }
    const sp = req.nextUrl.searchParams;
    const { range, error } = parseReportDays(sp.get("from"), sp.get("to"));
    if (!range) return NextResponse.json({ error }, { status: 400 });

    const orgId = member.organizationId;
    const rentalIds = (await getBusinessRentals(session.user.id)).map(r => r._id);
    const dealIds = await getOrgDealIds(orgId);
    const bookingScope = { $or: [{ rentalId: { $in: rentalIds } }, { dealId: { $in: dealIds } }, { organizationId: orgId }] };
    const span = { $gte: range.prevFrom, $lt: range.to };

    const [sales, rentals, made, customers] = await Promise.all([
      Purchase.find({ organizationId: orgId, status: "COMPLETED", completedAt: span })
        .select("completedAt askingPrice offerPrice agreedPrice vehicle source handledBy createdBy")
        .lean<Array<{ completedAt: Date; askingPrice: number; offerPrice?: number; agreedPrice?: number; vehicle: { title: string; make?: string }; source: string; handledBy?: Oid; createdBy?: Oid }>>(),
      Booking.aggregate<{ doneAt: Date; income: number; rentalId?: Oid; dealId?: Oid; offTitle?: string; source?: string; createdBy?: Oid }>([
        { $match: { ...bookingScope, status: "COMPLETED" } },
        { $project: {
          doneAt: { $ifNull: ["$completedAt", "$updatedAt"] },
          income: { $add: ["$totalAmount", { $ifNull: ["$lateFee", 0] }, { $ifNull: ["$extraCharges", 0] }] },
          rentalId: 1, dealId: 1, offTitle: "$offListVehicle.title", source: 1, createdBy: 1,
        } },
        { $match: { doneAt: span } },
      ]),
      Booking.find({ ...bookingScope, status: { $ne: "CANCELLED" }, createdAt: span }).select("createdAt").lean<Array<{ createdAt: Date }>>(),
      Customer.find({ organizationId: orgId, createdAt: span }).select("createdAt").lean<Array<{ createdAt: Date }>>(),
    ]);

    // Names for rented vehicles: a listing through its rental, or a rent deal
    const rentalDocs = await Rental.find({ _id: { $in: [...new Set(rentals.map(r => String(r.rentalId ?? "")).filter(Boolean))] } }).select("listingId").lean<Array<{ _id: Oid; listingId: Oid }>>();
    const [listings, deals] = await Promise.all([
      Listing.find({ _id: { $in: rentalDocs.map(r => r.listingId) } }).select("title make").lean<Array<{ _id: Oid; title: string; make?: string }>>(),
      Deal.find({ _id: { $in: rentals.map(r => r.dealId).filter(Boolean) } }).select("title make").lean<Array<{ _id: Oid; title: string; make?: string }>>(),
    ]);
    const listingById = new Map(listings.map(l => [String(l._id), l]));
    const listingOfRental = new Map(rentalDocs.map(r => [String(r._id), listingById.get(String(r.listingId))]));
    const dealById = new Map(deals.map(d => [String(d._id), d]));
    const rentedVehicle = (r: (typeof rentals)[number]) =>
      (r.rentalId && listingOfRental.get(String(r.rentalId))) || (r.dealId && dealById.get(String(r.dealId))) || { title: r.offTitle || "Other vehicle", make: undefined };

    const inCur = (d: Date) => d >= range.from && d < range.to;
    const totals = (cur: boolean): Totals => {
      const pick = (d: Date) => (cur ? inCur(d) : d < range.from);
      const s = sales.filter(x => pick(x.completedAt));
      const r = rentals.filter(x => pick(new Date(x.doneAt)));
      return {
        salesCount: s.length,
        salesValue: s.reduce((n, x) => n + salePrice(x), 0),
        rentalsCompleted: r.length,
        rentalIncome: r.reduce((n, x) => n + x.income, 0),
        bookingsMade: made.filter(x => pick(x.createdAt)).length,
        newCustomers: customers.filter(x => pick(x.createdAt)).length,
      };
    };

    const curSales = sales.filter(x => inCur(x.completedAt));
    const curRentals = rentals.filter(x => inCur(new Date(x.doneAt)));

    // Per vehicle (by name, so a vehicle sold and rented counts once) and per make
    const vehicles = new Map<string, { name: string; make: string; sales: number; salesValue: number; rentals: number; rentalIncome: number }>();
    const row = (name: string, make?: string) => {
      const key = name.trim().toLowerCase();
      if (!vehicles.has(key)) vehicles.set(key, { name, make: make || "Other", sales: 0, salesValue: 0, rentals: 0, rentalIncome: 0 });
      return vehicles.get(key)!;
    };
    for (const s of curSales) { const v = row(s.vehicle.title, s.vehicle.make); v.sales++; v.salesValue += salePrice(s); }
    for (const r of curRentals) { const veh = rentedVehicle(r); const v = row(veh.title, veh.make); v.rentals++; v.rentalIncome += r.income; }
    const byVehicle = [...vehicles.values()].map(v => ({ ...v, total: v.salesValue + v.rentalIncome })).sort((a, b) => b.total - a.total).slice(0, 25);
    const makes = new Map<string, { make: string; salesValue: number; rentalIncome: number }>();
    for (const v of vehicles.values()) {
      const m = makes.get(v.make) ?? { make: v.make, salesValue: 0, rentalIncome: 0 };
      m.salesValue += v.salesValue; m.rentalIncome += v.rentalIncome;
      makes.set(v.make, m);
    }
    const byMake = [...makes.values()].map(m => ({ ...m, total: m.salesValue + m.rentalIncome })).sort((a, b) => b.total - a.total);

    // Per team member: sales they handled (or recorded), and walk-in rentals they booked. Online rentals have no member.
    const staff = new Map<string, { sales: number; salesValue: number; walkInRentals: number; rentalIncome: number }>();
    const staffRow = (id?: Oid) => {
      const key = id ? String(id) : "";
      if (!staff.has(key)) staff.set(key, { sales: 0, salesValue: 0, walkInRentals: 0, rentalIncome: 0 });
      return staff.get(key)!;
    };
    for (const s of curSales) { const m = staffRow(s.handledBy ?? s.createdBy); m.sales++; m.salesValue += salePrice(s); }
    for (const r of curRentals) if (r.source === "WALK_IN") { const m = staffRow(r.createdBy); m.walkInRentals++; m.rentalIncome += r.income; }
    const names = await User.find({ _id: { $in: [...staff.keys()].filter(Boolean) } }).select("name email").lean<Array<{ _id: Oid; name?: string; email: string }>>();
    const nameOf = new Map(names.map(u => [String(u._id), u.name || u.email]));
    const byStaff = [...staff.entries()]
      .map(([id, v]) => ({ name: id ? nameOf.get(id) ?? "Former member" : "Online (no team member)", ...v, total: v.salesValue + v.rentalIncome }))
      .sort((a, b) => b.total - a.total);

    const bySource = {
      sales: { online: curSales.filter(s => s.source !== "WALK_IN").length, walkIn: curSales.filter(s => s.source === "WALK_IN").length },
      rentals: { online: curRentals.filter(r => r.source !== "WALK_IN").length, walkIn: curRentals.filter(r => r.source === "WALK_IN").length },
    };

    return NextResponse.json({
      range: { from: range.fromDay, to: range.toDay, days: range.days },
      current: totals(true),
      previous: totals(false),
      byVehicle,
      byStaff,
      byMake,
      bySource,
    });
  } catch (error) {
    reportError("Advanced report error:", error);
    return NextResponse.json({ error: "Couldn't build the report" }, { status: 500 });
  }
}
