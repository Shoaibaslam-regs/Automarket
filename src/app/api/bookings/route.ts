import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking";
import { Rental } from "@/models/Rental";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";
import { auth } from "@/lib/auth";
import { sendBookingRequestEmail } from "@/lib/email";
import { ensureBookingCustomer } from "@/lib/customerSync";
import { bookingClashQuery, rentalDays, validBookingDates } from "@/lib/bookings";
import { DEAL_BOOKING_FIELDS } from "@/lib/dealBookings";
import { Organization } from "@/models/Organization";
import { rateLimitResponse } from "@/lib/rateLimit";
import { triggerPusher } from "@/lib/support";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");

    let bookings;

    if (role === "owner") {
      const myRentals = await Rental.find({ ownerId: session.user.id }).select("_id listingId").lean();
      const rentalIds = myRentals.map((r) => r._id);
      bookings = await Booking.find({
        rentalId: { $in: rentalIds },
        deletedByOwner: { $ne: true },
        // Walk-in bookings have no renter account and are managed in the business console
        source: { $ne: "WALK_IN" },
      })
        .populate({ path: "rentalId", populate: { path: "listingId", select: "title images make model year location address type status" } })
        .populate("renterId", "name email phone")
        .sort({ createdAt: -1 })
        .lean();
    } else {
      bookings = await Booking.find({
        renterId: session.user.id,
        deletedByRenter: { $ne: true },
      })
        .populate({ path: "rentalId", populate: { path: "listingId", select: "title images make model year location address" } })
        .populate("dealId", DEAL_BOOKING_FIELDS)
        .populate("renterId", "name email phone")
        .sort({ createdAt: -1 })
        .lean();
    }

    const enriched = await Promise.all(
      (bookings as Array<Record<string, unknown>>).map(async (b) => {
        const rental = b.rentalId as { ownerId: { toString: () => string } } | null;
        if (rental?.ownerId) {
          const owner = await User.findById(rental.ownerId).select("name email phone").lean();
          return { ...b, owner };
        }
        // Deal bookings are with the business that published the deal
        const deal = b.dealId as { organizationId?: unknown } | null;
        if (deal?.organizationId) {
          const owner = await Organization.findById(deal.organizationId).select("name email phone").lean();
          return { ...b, owner };
        }
        return b;
      })
    );

    return NextResponse.json({ bookings: enriched });
  } catch (error) {
    console.error("Get bookings error:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = await rateLimitResponse("bookings", session.user.id, "booking requests");
    if (limited) return limited;

    await connectDB();
    const { rentalId, startDate, endDate } = await req.json();

    if (!rentalId || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (!validBookingDates(start, end)) {
      return NextResponse.json({ error: "The return date can't be before the pickup date" }, { status: 400 });
    }

    if (start < new Date()) {
      return NextResponse.json({ error: "Start date cannot be in the past" }, { status: 400 });
    }

    const rental = await Rental.findById(rentalId);
    if (!rental) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }

    if (rental.ownerId.toString() === session.user.id) {
      return NextResponse.json({ error: "You cannot book your own vehicle" }, { status: 400 });
    }

    const conflict = await Booking.findOne({
      rentalId,
      status: { $in: ["PENDING", "CONFIRMED", "ACTIVE"] },
      ...bookingClashQuery(start, end),
    });

    if (conflict) {
      return NextResponse.json({ error: "Vehicle is not available for selected dates" }, { status: 400 });
    }

    const days = rentalDays(start, end);
    const totalAmount = days * rental.dailyRate;
    const deposit = rental.deposit || 0;

    const booking = await Booking.create({
      rentalId,
      renterId: session.user.id,
      startDate: start,
      endDate: end,
      totalAmount,
      deposit,
      status: "PENDING",
    });

    // The renter becomes a customer of the business that owns the vehicle
    try {
      await ensureBookingCustomer(booking._id);
    } catch (customerError) {
      console.error("Adding booking customer failed:", customerError);
    }

    try {
      const listing = await Listing.findOne({ _id: rental.listingId }).lean() as { title: string } | null;
      const owner = await User.findById(rental.ownerId).lean() as { name?: string; email: string } | null;
      const renter = await User.findById(session.user.id).lean() as { name?: string; email: string; phone?: string } | null;

      if (owner && renter && listing) {
        await sendBookingRequestEmail({
          ownerEmail: owner.email,
          ownerName: owner.name ?? "Vehicle owner",
          renterName: renter.name ?? "A user",
          renterEmail: renter.email,
          renterPhone: renter.phone,
          listingTitle: listing.title,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          totalAmount,
          deposit,
          days,
          bookingId: booking._id.toString(),
        });
      }
    } catch (emailError) {
      console.error("Email send failed:", emailError);
    }

    // Owner's badge updates live, and their phone gets an alert if they turned alerts on
    await triggerPusher(`user-${rental.ownerId}`, "new-notification", { type: "booking", status: "PENDING" });
    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error("Create booking error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
