import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking";
import { Listing } from "@/models/Listing";
import { Customer } from "@/models/Customer";
import { can, getBusinessRentals, getMembership } from "@/lib/business";
import { bookingClashQuery, rentalDays, validBookingDates, bookingNumber } from "@/lib/bookings";
import { ensureBookingCustomer } from "@/lib/customerSync";
import { normalizeCnic, normalizePlate, samePlatePattern } from "@/lib/plates";
import { DEAL_BOOKING_FIELDS, businessBookingQuery } from "@/lib/dealBookings";
import { Deal } from "@/models/Deal";
import { dealPrice } from "@/lib/deals";
import { logBusinessAction } from "@/lib/businessLog";
import { reportError } from "@/lib/errorLog";

export const dynamic = "force-dynamic";

/** Every booking on the business's rental vehicles and rent deals, plus what a walk-in booking can be made for. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });

    const { rentals, query } = await businessBookingQuery(session.user.id, member.organizationId);
    const now = new Date();

    const [bookings, listings, rentDeals] = await Promise.all([
      Booking.find({ ...query, deletedByOwner: { $ne: true } })
        .populate({ path: "rentalId", select: "listingId dailyRate deposit plateNumber", populate: { path: "listingId", select: "title images make model year location type status" } })
        .populate("dealId", DEAL_BOOKING_FIELDS)
        .populate("renterId", "name email phone")
        .populate("customerId", "name phone")
        .populate("createdBy", "name")
        .sort({ createdAt: -1 })
        .lean(),
      Listing.find({ _id: { $in: rentals.map(r => r.listingId) }, status: { $in: ["ACTIVE", "RENTED", "PENDING"] } })
        .select("title images make model year")
        .lean<Array<{ _id: mongoose.Types.ObjectId; title: string; images: string[]; make: string; model: string; year: number }>>(),
      // Running rent deals can be booked for walk-ins too
      Deal.find({ organizationId: member.organizationId, dealType: "RENT", paused: false, disabledByAdmin: false, endsAt: { $gte: now } })
        .select("title images price discountType discountValue deposit vehicleCount")
        .lean<Array<{ _id: mongoose.Types.ObjectId; title: string; images: string[]; price: number; discountType: "PERCENT" | "AMOUNT"; discountValue: number; deposit?: number; vehicleCount: number }>>(),
    ]);

    const rentalByListing = new Map(rentals.map(r => [r.listingId.toString(), r]));
    const vehicles = listings.map(l => {
      const r = rentalByListing.get(l._id.toString())!;
      return { rentalId: r._id.toString(), title: l.title, image: l.images?.[0] ?? null, dailyRate: r.dailyRate, deposit: r.deposit ?? 0 };
    });
    // Deals share the picker; their id is prefixed so the POST can tell them apart
    for (const d of rentDeals) {
      vehicles.push({
        rentalId: `deal:${d._id}`,
        title: `Deal: ${d.title}${d.vehicleCount > 1 ? ` (${d.vehicleCount} cars)` : ""}`,
        image: d.images?.[0] ?? null,
        dailyRate: dealPrice(d.price, d),
        deposit: d.deposit ?? 0,
      });
    }

    return NextResponse.json({
      bookings,
      vehicles,
      permissions: { role: member.role, canManage: can(member.role, "manageBookings") },
    });
  } catch (error) {
    reportError("Business bookings GET error:", error);
    return NextResponse.json({ error: "Failed to load bookings" }, { status: 500 });
  }
}

/** Creates a booking for a walk-in customer (no AutoGO account needed). */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!can(member.role, "manageBookings")) {
      return NextResponse.json({ error: "Your role can't create bookings" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { rentalId, startDate, endDate, customerId, notes, status = "CONFIRMED" } = body;
    const customer = body.customer ?? {};
    if (!["PENDING", "CONFIRMED"].includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    // The picker sends a rental id, "deal:<id>" for one of the business's rent deals, or "other" for a
    // vehicle that isn't listed on AutoGO, described in `offList`
    const offListPick = rentalId === "other";
    const dealPick = typeof rentalId === "string" && rentalId.startsWith("deal:") ? rentalId.slice(5) : null;
    const targetId = dealPick ?? rentalId;
    if (!offListPick && (typeof targetId !== "string" || !mongoose.Types.ObjectId.isValid(targetId))) {
      return NextResponse.json({ error: "Choose a vehicle" }, { status: 400 });
    }

    let target: {
      rentalId?: mongoose.Types.ObjectId; dealId?: mongoose.Types.ObjectId;
      offList?: { title: string; dailyRate: number; deposit: number }; plateNumber?: string;
      dailyRate: number; deposit: number;
    };
    if (offListPick) {
      const o = (body.offList ?? {}) as Record<string, unknown>;
      const title = typeof o.title === "string" ? o.title.replace(/\s+/g, " ").trim().slice(0, 100) : "";
      const dailyRate = Number(o.dailyRate);
      const deposit = o.deposit === undefined || o.deposit === "" ? 0 : Number(o.deposit);
      if (title.length < 2) return NextResponse.json({ error: "Enter the vehicle, e.g. Toyota Corolla 2020 (white)" }, { status: 400 });
      if (!Number.isFinite(dailyRate) || dailyRate < 1) return NextResponse.json({ error: "Enter the daily rate in PKR" }, { status: 400 });
      if (!Number.isFinite(deposit) || deposit < 0) return NextResponse.json({ error: "The deposit must be 0 or more" }, { status: 400 });
      const plate = o.plateNumber ? normalizePlate(o.plateNumber) : null;
      if (o.plateNumber && !plate) return NextResponse.json({ error: "Enter the number plate like LEA-1234, or leave it empty" }, { status: 400 });
      target = { offList: { title, dailyRate: Math.round(dailyRate), deposit: Math.round(deposit) }, plateNumber: plate ?? undefined, dailyRate: Math.round(dailyRate), deposit: Math.round(deposit) };
    } else if (dealPick) {
      const deal = await Deal.findOne({ _id: targetId, organizationId: member.organizationId, dealType: "RENT" })
        .select("price discountType discountValue deposit")
        .lean<{ _id: mongoose.Types.ObjectId; price: number; discountType: "PERCENT" | "AMOUNT"; discountValue: number; deposit?: number }>();
      if (!deal) return NextResponse.json({ error: "This deal isn't one of your rent deals" }, { status: 404 });
      target = { dealId: deal._id, dailyRate: dealPrice(deal.price, deal), deposit: deal.deposit ?? 0 };
    } else {
      const rental = (await getBusinessRentals(session.user.id)).find(r => r._id.equals(targetId));
      if (!rental) return NextResponse.json({ error: "This vehicle isn't in your business inventory" }, { status: 404 });
      target = { rentalId: rental._id, dailyRate: rental.dailyRate, deposit: rental.deposit ?? 0 };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return NextResponse.json({ error: "Choose start and end dates" }, { status: 400 });
    if (!validBookingDates(start, end)) return NextResponse.json({ error: "The return date can't be before the pickup date" }, { status: 400 });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) return NextResponse.json({ error: "Start date cannot be in the past" }, { status: 400 });

    // Optional link to a CRM customer, whose details fill any blanks
    let linkedCustomer: { _id: mongoose.Types.ObjectId; name: string; phone: string; email?: string } | null = null;
    if (customerId) {
      if (!mongoose.Types.ObjectId.isValid(customerId)) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      linkedCustomer = await Customer.findOne({ _id: customerId, organizationId: member.organizationId })
        .select("name phone email")
        .lean<{ _id: mongoose.Types.ObjectId; name: string; phone: string; email?: string }>();
      if (!linkedCustomer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const walkIn = {
      name: str(customer.name) || linkedCustomer?.name || "",
      phone: str(customer.phone) || linkedCustomer?.phone || "",
      email: str(customer.email) || linkedCustomer?.email || undefined,
      cnic: normalizeCnic(customer.cnic) ?? (str(customer.cnic) || undefined),
    };
    if (!walkIn.name || !walkIn.phone) return NextResponse.json({ error: "Customer name and phone are required" }, { status: 400 });

    // An unlisted vehicle can only be checked for clashes by its number plate
    const clashOn = target.dealId ? { dealId: target.dealId }
      : target.rentalId ? { rentalId: target.rentalId }
      : target.plateNumber ? { organizationId: member.organizationId, plateNumber: samePlatePattern(target.plateNumber) }
      : null;
    const conflict = clashOn && await Booking.exists({
      ...clashOn,
      status: { $in: ["PENDING", "CONFIRMED", "ACTIVE"] },
      ...bookingClashQuery(start, end),
    });
    if (conflict) return NextResponse.json({ error: target.dealId ? "This deal is already booked for some of those dates" : target.offList ? `${target.plateNumber} is already booked for some of those dates` : "This vehicle is already booked for some of those dates" }, { status: 409 });

    const days = rentalDays(start, end);
    const booking = await Booking.create({
      rentalId: target.rentalId,
      dealId: target.dealId,
      offListVehicle: target.offList,
      // Off-list vehicles have nothing else tying the booking to the business
      organizationId: target.offList ? member.organizationId : undefined,
      plateNumber: target.plateNumber,
      source: "WALK_IN",
      walkIn,
      customerId: linkedCustomer?._id,
      createdBy: session.user.id,
      notes: str(notes) || undefined,
      startDate: start,
      endDate: end,
      totalAmount: days * target.dailyRate,
      deposit: target.deposit,
      status,
      ...(status === "CONFIRMED" && { confirmedAt: new Date() }),
      // Nobody on the renter side to notify
      seenByRenter: true,
    });

    // A walk-in typed in by hand still ends up in the customer list
    if (!linkedCustomer) {
      try {
        await ensureBookingCustomer(booking._id);
      } catch (e) {
        reportError("Adding walk-in customer failed:", e);
      }
    }

    await logBusinessAction({ userId: session.user.id, organizationId: member.organizationId }, "booking.create",
      { type: "BOOKING", id: booking._id, label: bookingNumber(String(booking._id)) },
      { details: `${walkIn?.name ?? "Walk-in"} · ${days} day${days !== 1 ? "s" : ""}`, amount: booking.totalAmount });
    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    reportError("Business booking POST error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
