import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking";
import { Rental } from "@/models/Rental";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";
import { auth } from "@/lib/auth";
import { sendBookingConfirmedEmail } from "@/lib/email";
import { reportError } from "@/lib/errorLog";
import { PERSONAL_OWNER_MOVES, RENTER_MOVES } from "@/lib/bookings";
import { CONFIRM_CLASH_ERROR, cancelClashingRequests, confirmClash } from "@/lib/bookingConfirm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    await connectDB();
    const { status } = await req.json().catch(() => ({}));
    const booking = await Booking.findById(id).populate("rentalId");
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    // The rental is gone when its vehicle was deleted; only the renter can still act on the booking then
    const rental = booking.rentalId as {
      ownerId: { toString: () => string };
      listingId: { toString: () => string };
    } | null;
    const isOwner = rental?.ownerId.toString() === session.user.id;
    const isRenter = booking.renterId?.toString() === session.user.id;
    if (!isOwner && !isRenter) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isRenter && !isOwner && status !== "CANCELLED") {
      return NextResponse.json({ error: "Renters can only cancel" }, { status: 403 });
    }
    // Each side may only make the moves that fit where the booking is (src/lib/bookings.ts): a renter could
    // otherwise cancel a booking after the car was handed over or returned, rewriting the owner's records
    const allowed = isOwner ? PERSONAL_OWNER_MOVES[booking.status] ?? [] : RENTER_MOVES[booking.status] ?? [];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: booking.status === "ACTIVE" || booking.status === "COMPLETED"
        ? "This booking can't be cancelled any more: the vehicle has already been handed over."
        : "That change isn't possible for this booking." }, { status: 400 });
    }
    // Requests don't hold dates, so the confirmation is where two bookings could meet
    if (status === "CONFIRMED" && (await confirmClash(booking))) {
      return NextResponse.json({ error: CONFIRM_CLASH_ERROR, code: "DATES_TAKEN" }, { status: 409 });
    }
    booking.status = status;
    if (status === "CONFIRMED") booking.confirmedAt = new Date();
    if (status === "CANCELLED") booking.cancelledAt = new Date();
    if (isOwner && (status === "CONFIRMED" || status === "CANCELLED")) {
      booking.seenByRenter = false;
    }
    await booking.save();
    // The other requests for those days can't be confirmed any more: cancel them so their renters look elsewhere
    if (status === "CONFIRMED") await cancelClashingRequests(booking);

    if (isOwner && rental && (status === "CONFIRMED" || status === "CANCELLED")) {
      try {
        const listing = await Listing.findById(rental.listingId).lean() as { title: string } | null;
        const renter = await User.findById(booking.renterId).lean() as { name?: string; email: string } | null;
        const owner = await User.findById(session.user.id).lean() as { phone?: string } | null;
        if (renter && listing) {
          await sendBookingConfirmedEmail({
            renterEmail: renter.email,
            renterName: renter.name ?? "Renter",
            listingTitle: listing.title,
            startDate: booking.startDate.toISOString(),
            endDate: booking.endDate.toISOString(),
            ownerPhone: owner?.phone,
            status: status as "CONFIRMED" | "CANCELLED",
          });
        }
      } catch (e) {
        reportError("Email failed:", e);
      }
    }
    return NextResponse.json({ booking });
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    await connectDB();
    const booking = await Booking.findById(id).populate("rentalId");
    if (!booking) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // A missing rental means the vehicle was deleted: nobody can manage the booking any more
    const rental = booking.rentalId as { ownerId: { toString: () => string } } | null;
    const vehicleGone = !rental;
    const isOwner = rental?.ownerId.toString() === session.user.id;
    const isRenter = booking.renterId?.toString() === session.user.id;
    if (!isOwner && !isRenter) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!vehicleGone && !["COMPLETED", "CANCELLED"].includes(booking.status)) {
      return NextResponse.json({ error: "Only completed or cancelled bookings can be removed" }, { status: 400 });
    }
    if (isOwner) booking.deletedByOwner = true;
    if (isRenter) booking.deletedByRenter = true;
    // With the vehicle gone the owner can never see it, so the renter removing it is final
    if ((booking.deletedByOwner && booking.deletedByRenter) || (vehicleGone && isRenter)) {
      await Booking.findByIdAndDelete(id);
    } else {
      await booking.save();
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
