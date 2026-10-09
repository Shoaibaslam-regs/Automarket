import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking";
import { Listing } from "@/models/Listing";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { can, getBusinessRentals, getMembership } from "@/lib/business";
import { canTransition } from "@/lib/bookings";
import { sendBookingConfirmedEmail } from "@/lib/email";
import { triggerPusher } from "@/lib/support";

/** Finds a booking that belongs to one of the caller's business rental vehicles. */
async function loadBusinessBooking(userId: string, id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const rentals = await getBusinessRentals(userId);
  return Booking.findOne({ _id: id, rentalId: { $in: rentals.map(r => r._id) } });
}

/** Everything the printable booking slip needs. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });

    const found = await loadBusinessBooking(session.user.id, id);
    if (!found) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const [booking, organization] = await Promise.all([
      Booking.findById(found._id)
        .populate({ path: "rentalId", select: "listingId dailyRate weeklyRate monthlyRate deposit", populate: { path: "listingId", select: "title make model year color fuelType transmission location images" } })
        .populate("renterId", "name email phone")
        .populate("createdBy", "name")
        .lean(),
      Organization.findById(member.organizationId).select("name phone email address city logo type").lean(),
    ]);
    return NextResponse.json({ booking, organization });
  } catch (error) {
    console.error("Business booking GET error:", error);
    return NextResponse.json({ error: "Failed to load booking" }, { status: 500 });
  }
}

/** Moves a booking along PENDING → CONFIRMED → ACTIVE → COMPLETED (or cancels it). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!can(member.role, "manageBookings")) {
      return NextResponse.json({ error: "Your role can't manage bookings" }, { status: 403 });
    }

    const { status } = await req.json().catch(() => ({}));
    const booking = await loadBusinessBooking(session.user.id, id);
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (!canTransition(booking.status, status)) {
      return NextResponse.json({ error: `A ${booking.status.toLowerCase()} booking can't be moved to ${String(status).toLowerCase()}` }, { status: 400 });
    }

    booking.status = status;
    const now = new Date();
    if (status === "CONFIRMED") booking.confirmedAt = now;
    if (status === "ACTIVE") booking.startedAt = now;
    if (status === "COMPLETED") booking.completedAt = now;
    if (status === "CANCELLED") booking.cancelledAt = now;

    // Online renters hear about confirmations and cancellations, as on the personal bookings page
    const notifyRenter = booking.source !== "WALK_IN" && booking.renterId && (status === "CONFIRMED" || status === "CANCELLED");
    if (notifyRenter) booking.seenByRenter = false;
    await booking.save();

    if (notifyRenter) {
      try {
        const rental = (await getBusinessRentals(session.user.id)).find(r => r._id.equals(booking.rentalId));
        const [listing, renter, org] = await Promise.all([
          Listing.findById(rental?.listingId).select("title").lean<{ title: string }>(),
          User.findById(booking.renterId).select("name email").lean<{ name?: string; email: string }>(),
          Organization.findById(member.organizationId).select("phone").lean<{ phone?: string }>(),
        ]);
        if (renter && listing) {
          await sendBookingConfirmedEmail({
            renterEmail: renter.email,
            renterName: renter.name ?? "Renter",
            listingTitle: listing.title,
            startDate: booking.startDate.toISOString(),
            endDate: booking.endDate.toISOString(),
            ownerPhone: org?.phone,
            status,
          });
        }
        await triggerPusher(`user-${booking.renterId}`, "new-notification", { type: "booking", status });
      } catch (e) {
        console.error("Booking notification failed:", e);
      }
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Business booking PATCH error:", error);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}

/**
 * Removes a finished (completed or cancelled) booking from the business's list.
 * Online renters keep their own copy until they remove it too; walk-ins have no other viewer, so they're deleted.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!can(member.role, "manageBookings")) {
      return NextResponse.json({ error: "Your role can't remove bookings" }, { status: 403 });
    }

    const booking = await loadBusinessBooking(session.user.id, id);
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (!["COMPLETED", "CANCELLED"].includes(booking.status)) {
      return NextResponse.json({ error: "Only completed or cancelled bookings can be removed" }, { status: 400 });
    }

    if (booking.source === "WALK_IN" || booking.deletedByRenter) {
      await booking.deleteOne();
    } else {
      booking.deletedByOwner = true;
      await booking.save();
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Business booking DELETE error:", error);
    return NextResponse.json({ error: "Failed to remove booking" }, { status: 500 });
  }
}
