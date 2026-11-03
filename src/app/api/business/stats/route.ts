import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getOrgDealIds } from "@/lib/dealBookings";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { Customer } from "@/models/Customer";
import { Booking } from "@/models/Booking";
import { Purchase } from "@/models/Purchase";
import { auth } from "@/lib/auth";
import { can, getBusinessRentals, getMembership, getOrgUserIds } from "@/lib/business";
import { getSubscription, subscriptionHas } from "@/lib/subscription";
import { planFor } from "@/lib/plans";
import { salePrice } from "@/lib/purchases";
import { isReportPeriod, pkMonthKey, reportMonths, reportRange } from "@/lib/reportPeriods";
import { reportError } from "@/lib/errorLog";

export const dynamic = "force-dynamic";

type Oid = mongoose.Types.ObjectId;

/**
 * The business's numbers. Every member gets the counts the dashboard shows (vehicles, customers, bookings, and
 * sales this month). `report` is Business → Reports (`?period=` from src/lib/reportPeriods.ts, Pakistan months):
 * sales from the real sale records and rental income for the period, with a month-by-month chart. It needs a plan
 * with Sales reports (PLAN_FEATURES; a business's free month counts as Premium), else `reportLocked` names the plan.
 * Money amounts go only to the owner and managers (`manageMoney`); others get null.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    const orgId = member.organizationId;
    const canSeeMoney = can(member.role, "manageMoney");
    const sub = await getSubscription(session.user.id);
    const reportAllowed = subscriptionHas(sub, "salesReports");
    const period = isReportPeriod(req.nextUrl.searchParams.get("period")) ? req.nextUrl.searchParams.get("period") as Parameters<typeof reportRange>[0] : "this-month";

    // Bookings have no organization field; they belong to the business through its rental vehicles, its rent deals,
    // and walk-ins for unlisted vehicles
    const rentalIds = (await getBusinessRentals(session.user.id)).map(r => r._id);
    const bookingScope = { $or: [{ rentalId: { $in: rentalIds } }, { dealId: { $in: await getOrgDealIds(orgId) } }, { organizationId: orgId }] };
    const memberIds = await getOrgUserIds(orgId);
    // Rent plus any late-return fee and extra charges; bookings finished before completedAt existed use their last update
    const rentIncome = { $add: ["$totalAmount", { $ifNull: ["$lateFee", 0] }, { $ifNull: ["$extraCharges", 0] }] };
    const completedOn = { $ifNull: ["$completedAt", "$updatedAt"] };

    const thisMonth = reportRange("this-month");
    const range = reportRange(period);
    const months = reportMonths(period);
    const chartFrom = months[0].from;
    const chartTo = months[months.length - 1].to;

    const [
      totalVehicles, available, sold, reserved,
      totalCustomers, leads, testDrives, closedSales,
      bookingsByStatus, bookingsBySource, depositsHeld,
      salesThisMonth, saleRows, rentalRows, rentalTotal,
    ] = await Promise.all([
      Listing.countDocuments({ sellerId: { $in: memberIds } }),
      Listing.countDocuments({ sellerId: { $in: memberIds }, status: "ACTIVE" }),
      Listing.countDocuments({ sellerId: { $in: memberIds }, status: "SOLD" }),
      Listing.countDocuments({ sellerId: { $in: memberIds }, status: "PENDING" }),
      Customer.countDocuments({ organizationId: orgId }),
      Customer.countDocuments({ organizationId: orgId, status: "LEAD" }),
      Customer.countDocuments({ organizationId: orgId, status: "TEST_DRIVE" }),
      Customer.countDocuments({ organizationId: orgId, status: "SOLD" }),
      Booking.aggregate<{ _id: string; count: number }>([{ $match: bookingScope }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      Booking.aggregate<{ _id: string | null; count: number }>([
        { $match: { ...bookingScope, status: { $ne: "CANCELLED" } } },
        { $group: { _id: "$source", count: { $sum: 1 } } },
      ]),
      // Deposits held for vehicles that are out now
      Booking.aggregate<{ total: number }>([{ $match: { ...bookingScope, status: "ACTIVE" } }, { $group: { _id: null, total: { $sum: "$deposit" } } }]),
      // Sales are the business's sale records marked sold (src/lib/purchases.ts): the final price, walk-ins and deals
      // included, and records the business removed from its list too, like the cash book
      salesInRange(orgId, thisMonth.from, thisMonth.to),
      reportAllowed ? salesInRange(orgId, chartFrom, chartTo) : Promise.resolve([]),
      reportAllowed
        ? Booking.aggregate<{ doneAt: Date; income: number }>([
            { $match: { ...bookingScope, status: "COMPLETED" } },
            { $project: { doneAt: completedOn, income: rentIncome } },
            { $match: { doneAt: { $gte: chartFrom, $lt: chartTo } } },
          ])
        : Promise.resolve([]),
      reportAllowed && canSeeMoney
        ? Booking.aggregate<{ total: number }>([{ $match: { ...bookingScope, status: "COMPLETED" } }, { $group: { _id: null, total: { $sum: rentIncome } } }])
        : Promise.resolve([]),
    ]);

    const byStatus = (s: string) => bookingsByStatus.find(x => x._id === s)?.count ?? 0;
    const money = (n: number) => (canSeeMoney ? n : null);
    const inRange = (d: Date) => d >= range.from && d < range.to;
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

    const report = reportAllowed
      ? {
          period: { key: period, label: range.label, from: range.from.toISOString(), to: range.to.toISOString() },
          canSeeMoney,
          sales: {
            count: saleRows.filter(s => inRange(s.completedAt)).length,
            value: money(sum(saleRows.filter(s => inRange(s.completedAt)).map(s => s.price))),
          },
          rentals: {
            completed: rentalRows.filter(r => inRange(new Date(r.doneAt))).length,
            revenue: money(sum(rentalRows.filter(r => inRange(new Date(r.doneAt))).map(r => r.income))),
            revenueTotal: money(rentalTotal[0]?.total ?? 0),
          },
          byMonth: months.map(m => {
            const s = saleRows.filter(x => pkMonthKey(x.completedAt) === m.key);
            const r = rentalRows.filter(x => pkMonthKey(x.doneAt) === m.key);
            return { month: m.month, key: m.key, sales: s.length, salesValue: money(sum(s.map(x => x.price))), rentalRevenue: money(sum(r.map(x => x.income))) };
          }),
        }
      : null;

    return NextResponse.json({
      inventory: { totalVehicles, available, sold, reserved },
      customers: { totalCustomers, leads, testDrives, closedSales },
      rentals: {
        totalBookings: bookingsByStatus.reduce((n, x) => n + (x._id === "CANCELLED" ? 0 : x.count), 0),
        activeRentals: byStatus("ACTIVE"),
        pending: byStatus("PENDING"),
        upcoming: byStatus("CONFIRMED"),
        completed: byStatus("COMPLETED"),
        cancelled: byStatus("CANCELLED"),
        online: bookingsBySource.filter(x => x._id !== "WALK_IN").reduce((n, x) => n + x.count, 0),
        walkIn: bookingsBySource.find(x => x._id === "WALK_IN")?.count ?? 0,
        depositsHeld: money(depositsHeld[0]?.total ?? 0),
      },
      // The dashboard's "This month sales" (Pakistan month)
      monthly: { sales: salesThisMonth.length, revenue: money(sum(salesThisMonth.map(s => s.price))) },
      report,
      reportLocked: reportAllowed ? null : { plan: planFor("salesReports").name },
    });
  } catch (error) {
    reportError("Business stats error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** Sales marked sold between two instants, with their final price (salePrice: agreed, else offer, else asking). */
async function salesInRange(orgId: Oid, from: Date, to: Date): Promise<{ completedAt: Date; price: number }[]> {
  const rows = await Purchase.find({ organizationId: orgId, status: "COMPLETED", completedAt: { $gte: from, $lt: to } })
    .select("completedAt askingPrice offerPrice agreedPrice")
    .lean<Array<{ completedAt: Date; askingPrice: number; offerPrice?: number; agreedPrice?: number }>>();
  return rows.map(r => ({ completedAt: r.completedAt, price: salePrice(r) }));
}
