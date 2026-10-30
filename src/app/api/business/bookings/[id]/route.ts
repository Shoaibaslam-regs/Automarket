import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking";
import { Listing } from "@/models/Listing";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { can, getBusinessRentals, getMembership } from "@/lib/business";
import { bookingDailyRate, canTransition, lateCharge, bookingNumber } from "@/lib/bookings";
import { sendBookingConfirmedEmail } from "@/lib/email";
import { CONFIRM_CLASH_ERROR, cancelClashingRequests, confirmClash } from "@/lib/bookingConfirm";
import { triggerPusher } from "@/lib/support";
import { Rental } from "@/models/Rental";
import { normalizeCnic, normalizePlate } from "@/lib/plates";
import { DEAL_BOOKING_FIELDS, businessBookingQuery } from "@/lib/dealBookings";
import { Deal } from "@/models/Deal";
import { logBusinessAction } from "@/lib/businessLog";
import { parseCheck } from "@/lib/checklist";
import { reportError } from "@/lib/errorLog";

/** Finds a booking that belongs to one of the caller's business rental vehicles. */
async function loadBusinessBooking(userId: string, id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const member = await getMembership(userId);
  if (!member) return null;
  // Bookings on the business's rental vehicles or on its rent deals
  const { query } = await businessBookingQuery(userId, member.organizationId);
  return Booking.findOne({ _id: id, ...query });
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
        .populate({ path: "rentalId", select: "listingId dailyRate weeklyRate monthlyRate deposit plateNumber", populate: { path: "listingId", select: "title make model year color fuelType transmission location address images" } })
        .populate("dealId", DEAL_BOOKING_FIELDS)
        .populate("renterId", "name email phone")
        .populate("createdBy", "name")
        .lean(),
      Organization.findById(member.organizationId).select("name phone email address city logo type").lean(),
    ]);
    return NextResponse.json({ booking, organization });
  } catch (error) {
    reportError("Business booking GET error:", error);
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

    const { status, plateNumber, cnic, dueBackAt, returnedAt, checkOut, checkIn, extraCharges, extraChargesNote } = await req.json().catch(() => ({}));
    const booking = await loadBusinessBooking(session.user.id, id);
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (!canTransition(booking.status, status)) {
      return NextResponse.json({ error: `A ${booking.status.toLowerCase()} booking can't be moved to ${String(status).toLowerCase()}` }, { status: 400 });
    }

    // Handing over records the number plate of the vehicle that went out and the renter's CNIC
    let plate: string | null = null;
    if (status === "ACTIVE") {
      plate = normalizePlate(plateNumber);
      if (!plate) return NextResponse.json({ error: "Enter the number plate of the vehicle you're handing over, e.g. LEA-1234" }, { status: 400 });
      const renterCnic = normalizeCnic(cnic);
      if (!renterCnic) return NextResponse.json({ error: "Enter the renter's 13-digit CNIC, e.g. 35202-1234567-1" }, { status: 400 });
      booking.plateNumber = plate;
      booking.renterCnic = renterCnic;
      // The exact time the renter must bring it back; late fees count from here
      const due = new Date(dueBackAt);
      if (!dueBackAt || isNaN(due.getTime())) return NextResponse.json({ error: "Set the exact date and time the vehicle must be returned" }, { status: 400 });
      if (due.getTime() <= Date.now()) return NextResponse.json({ error: "The return time must be later than now" }, { status: 400 });
      booking.dueBackAt = due;
      // Condition when it went out (odometer, fuel, notes, photos), all optional
      const out = parseCheck(checkOut);
      if (out.error) return NextResponse.json({ error: out.error }, { status: 400 });
      if (out.check) booking.checkOut = out.check;
    }

    // Returning records when it came back and charges each late day at the normal daily rent (after the grace hour)
    if (status === "COMPLETED") {
      const back = returnedAt ? new Date(returnedAt) : new Date();
      if (isNaN(back.getTime())) return NextResponse.json({ error: "Enter when the vehicle came back" }, { status: 400 });
      if (back.getTime() > Date.now() + 5 * 60 * 1000) return NextResponse.json({ error: "The return time can't be in the future" }, { status: 400 });
      if (booking.startedAt && back < booking.startedAt) return NextResponse.json({ error: "The return time is before the handover" }, { status: 400 });
      const late = lateCharge(booking.dueBackAt, back, bookingDailyRate(booking));
      booking.returnedAt = back;
      booking.lateDays = late.lateDays;
      booking.lateFee = late.fee;
      // Condition when it came back, and any extra charges (fuel, damage, extra km)
      const back_ = parseCheck(checkIn);
      if (back_.error) return NextResponse.json({ error: back_.error }, { status: 400 });
      const outKm = booking.checkOut?.odometer;
      if (back_.check?.odometer != null && outKm != null && back_.check.odometer < outKm) {
        return NextResponse.json({ error: `The odometer can't be lower than at handover (${outKm.toLocaleString()} km)` }, { status: 400 });
      }
      if (back_.check) booking.checkIn = back_.check;
      const extra = extraCharges ? Math.round(Number(extraCharges)) : 0;
      if (!Number.isFinite(extra) || extra < 0 || extra > 10_000_000) return NextResponse.json({ error: "Enter the extra charges in PKR" }, { status: 400 });
      if (extra > 0 && !String(extraChargesNote ?? "").trim()) return NextResponse.json({ error: "Say what the extra charges are for" }, { status: 400 });
      booking.extraCharges = extra || undefined;
      booking.extraChargesNote = extra ? String(extraChargesNote).trim().slice(0, 200) : undefined;
    }

    // Requests don't hold dates, so the confirmation is where two bookings could meet
    if (status === "CONFIRMED" && (await confirmClash(booking))) {
      return NextResponse.json({ error: CONFIRM_CLASH_ERROR, code: "DATES_TAKEN" }, { status: 409 });
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
    // The other requests for those days can't be confirmed any more: cancel them so their renters look elsewhere
    if (status === "CONFIRMED") await cancelClashingRequests(booking);
    if (plate && booking.rentalId) await Rental.updateOne({ _id: booking.rentalId }, { $set: { plateNumber: plate } });
    {
      const act = { CONFIRMED: "booking.confirm", CANCELLED: "booking.cancel", ACTIVE: "booking.handover", COMPLETED: "booking.return" }[status as string];
      if (act) {
        await logBusinessAction({ userId: session.user.id, organizationId: member.organizationId }, act,
          { type: "BOOKING", id: booking._id, label: bookingNumber(String(booking._id)) },
          { details: [booking.walkIn?.name, plate && `plate ${plate}`, status === "COMPLETED" && (booking.lateFee ?? 0) > 0 && `late fee PKR ${booking.lateFee!.toLocaleString()}`, status === "COMPLETED" && (booking.extraCharges ?? 0) > 0 && `extra PKR ${booking.extraCharges!.toLocaleString()}`].filter(Boolean).join(" · ") || undefined });
      }
    }

    if (notifyRenter) {
      try {
        const rental = booking.rentalId ? (await getBusinessRentals(session.user.id)).find(r => r._id.equals(booking.rentalId!)) : undefined;
        const deal = booking.dealId ? await Deal.findById(booking.dealId).select("title").lean<{ title: string }>() : null;
        const [listing, renter, org] = await Promise.all([
          deal ? Promise.resolve(deal) : Listing.findById(rental?.listingId).select("title").lean<{ title: string }>(),
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
        reportError("Booking notification failed:", e);
      }
    }

    return NextResponse.json({ booking });
  } catch (error) {
    reportError("Business booking PATCH error:", error);
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
    await logBusinessAction({ userId: session.user.id, organizationId: member.organizationId }, "booking.remove",
      { type: "BOOKING", id: booking._id, label: bookingNumber(String(booking._id)) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    reportError("Business booking DELETE error:", error);
    return NextResponse.json({ error: "Failed to remove booking" }, { status: 500 });
  }
}
