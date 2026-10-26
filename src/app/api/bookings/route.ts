import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking";
import { Rental } from "@/models/Rental";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";
import { auth } from "@/lib/auth";
import { sendBookingRequestEmail } from "@/lib/email";
import { ensureBookingCustomer } from "@/lib/customerSync";
import { MAX_OPEN_REQUESTS, bookingClashQuery, bookingLengthError, holdsDatesQuery, rentalDays, requestExpiryCutoff, validBookingDates } from "@/lib/bookings";
import { DEAL_BOOKING_FIELDS, getOrgDealIds } from "@/lib/dealBookings";
import { can, getMembership } from "@/lib/business";
import { Organization } from "@/models/Organization";
import { rateLimitResponse } from "@/lib/rateLimit";
import { triggerPusher } from "@/lib/support";
import { notifyTeam, organizationOf } from "@/lib/teamNotify";
import { reportError } from "@/lib/errorLog";

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
      // Online requests for the business's rent deals, for the members who handle bookings. The badge counts
      // them (/api/bookings/count), so they must show here too; they are handled in the business console
      // (managedInBusiness), where the deal's handover, payment and slip live.
      const member = await getMembership(session.user.id);
      if (member && can(member.role, "manageBookings")) {
        const dealIds = await getOrgDealIds(member.organizationId);
        if (dealIds.length) {
          const dealBookings = await Booking.find({ dealId: { $in: dealIds }, deletedByOwner: { $ne: true }, source: { $ne: "WALK_IN" } })
            .populate("dealId", DEAL_BOOKING_FIELDS)
            .populate("renterId", "name email phone")
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();
          bookings = [...bookings, ...dealBookings.map(b => ({ ...b, managedInBusiness: true }))]
            .sort((a, b) => new Date(b.createdAt as Date).getTime() - new Date(a.createdAt as Date).getTime());
        }
      }
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
    reportError("Get bookings error:", error);
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
    const tooLong = bookingLengthError(start, end);
    if (tooLong) return NextResponse.json({ error: tooLong }, { status: 400 });

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
      ...holdsDatesQuery(),
      ...bookingClashQuery(start, end),
    });

    if (conflict) {
      return NextResponse.json({ error: "Vehicle is not available for selected dates" }, { status: 400 });
    }

    // One renter can't hold many vehicles at once with unanswered requests
    const waiting = await Booking.countDocuments({ renterId: session.user.id, status: "PENDING", createdAt: { $gte: requestExpiryCutoff() } });
    if (waiting >= MAX_OPEN_REQUESTS) {
      return NextResponse.json({ error: `You have ${waiting} booking requests waiting for an answer. Wait for one, or cancel one in My bookings, before sending another.` }, { status: 429 });
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
      reportError("Adding booking customer failed:", customerError);
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
      reportError("Email send failed:", emailError);
    }

    // The vehicle's owner, and for a business vehicle everyone who handles bookings, get a badge and a phone alert
    await triggerPusher(`user-${rental.ownerId}`, "new-notification", { type: "booking", status: "PENDING" });
    const ownerOrg = await organizationOf(rental.ownerId);
    if (ownerOrg) await notifyTeam(ownerOrg, "manageBookings", { type: "booking", status: "PENDING" }, [String(rental.ownerId)]);
    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    reportError("Create booking error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
