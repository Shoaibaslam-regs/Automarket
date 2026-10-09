import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking";
import { Listing } from "@/models/Listing";
import { Customer } from "@/models/Customer";
import { can, getBusinessRentals, getMembership } from "@/lib/business";
import { rentalDays } from "@/lib/bookings";
import { ensureBookingCustomer } from "@/lib/customerSync";

export const dynamic = "force-dynamic";

/** Every booking on the business's rental vehicles, plus the vehicles a walk-in booking can be made for. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });

    const rentals = await getBusinessRentals(session.user.id);
    const rentalIds = rentals.map(r => r._id);

    const [bookings, listings] = await Promise.all([
      Booking.find({ rentalId: { $in: rentalIds }, deletedByOwner: { $ne: true } })
        .populate({ path: "rentalId", select: "listingId dailyRate deposit", populate: { path: "listingId", select: "title images make model year location" } })
        .populate("renterId", "name email phone")
        .populate("customerId", "name phone")
        .populate("createdBy", "name")
        .sort({ createdAt: -1 })
        .lean(),
      Listing.find({ _id: { $in: rentals.map(r => r.listingId) }, status: { $in: ["ACTIVE", "RENTED", "PENDING"] } })
        .select("title images make model year")
        .lean<Array<{ _id: mongoose.Types.ObjectId; title: string; images: string[]; make: string; model: string; year: number }>>(),
    ]);

    const rentalByListing = new Map(rentals.map(r => [r.listingId.toString(), r]));
    const vehicles = listings.map(l => {
      const r = rentalByListing.get(l._id.toString())!;
      return { rentalId: r._id.toString(), title: l.title, image: l.images?.[0] ?? null, dailyRate: r.dailyRate, deposit: r.deposit ?? 0 };
    });

    return NextResponse.json({
      bookings,
      vehicles,
      permissions: { role: member.role, canManage: can(member.role, "manageBookings") },
    });
  } catch (error) {
    console.error("Business bookings GET error:", error);
    return NextResponse.json({ error: "Failed to load bookings" }, { status: 500 });
  }
}

/** Creates a booking for a walk-in customer (no AutoMarket account needed). */
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
    if (typeof rentalId !== "string" || !mongoose.Types.ObjectId.isValid(rentalId)) {
      return NextResponse.json({ error: "Choose a vehicle" }, { status: 400 });
    }

    const rental = (await getBusinessRentals(session.user.id)).find(r => r._id.equals(rentalId));
    if (!rental) return NextResponse.json({ error: "This vehicle isn't in your business inventory" }, { status: 404 });

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return NextResponse.json({ error: "Choose start and end dates" }, { status: 400 });
    if (start >= end) return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
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
      cnic: str(customer.cnic) || undefined,
    };
    if (!walkIn.name || !walkIn.phone) return NextResponse.json({ error: "Customer name and phone are required" }, { status: 400 });

    const conflict = await Booking.exists({
      rentalId: rental._id,
      status: { $in: ["PENDING", "CONFIRMED", "ACTIVE"] },
      startDate: { $lte: end },
      endDate: { $gte: start },
    });
    if (conflict) return NextResponse.json({ error: "This vehicle is already booked for some of those dates" }, { status: 409 });

    const days = rentalDays(start, end);
    const booking = await Booking.create({
      rentalId: rental._id,
      source: "WALK_IN",
      walkIn,
      customerId: linkedCustomer?._id,
      createdBy: session.user.id,
      notes: str(notes) || undefined,
      startDate: start,
      endDate: end,
      totalAmount: days * rental.dailyRate,
      deposit: rental.deposit || 0,
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
        console.error("Adding walk-in customer failed:", e);
      }
    }

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error("Business booking POST error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
