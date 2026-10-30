// What confirming a booking means for the vehicle's other bookings. Requests never hold dates
// (holdsDatesQuery), so several renters can ask for the same days; the owner's confirmation decides:
// - confirmClash refuses a confirmation that overlaps a booking already confirmed or handed over;
// - cancelClashingRequests cancels the other waiting requests for those days, so those renters can look elsewhere
//   instead of waiting for an answer that can't come. Also used when a business adds a confirmed walk-in.

import mongoose from "mongoose";
import { Booking } from "@/models/Booking";
import { bookingClashQuery, holdsDatesQuery } from "@/lib/bookings";
import { samePlatePattern } from "@/lib/plates";
import { triggerPusher } from "@/lib/support";
import { reportError } from "@/lib/errorLog";

type Ref = mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId } | null | undefined;
type BookingLike = {
  _id: mongoose.Types.ObjectId;
  rentalId?: Ref;
  dealId?: Ref;
  organizationId?: Ref;
  plateNumber?: string | null;
  startDate: Date;
  endDate: Date;
};

const idOf = (v: Ref) => (v && typeof v === "object" && "_id" in v ? v._id : v) ?? undefined;

/** The other bookings of the same vehicle: same rental, same deal, or (unlisted vehicles) same business and plate. */
function sameVehicle(b: BookingLike): Record<string, unknown> | null {
  if (b.dealId) return { dealId: idOf(b.dealId) };
  if (b.rentalId) return { rentalId: idOf(b.rentalId) };
  if (b.organizationId && b.plateNumber) return { organizationId: idOf(b.organizationId), plateNumber: samePlatePattern(b.plateNumber) };
  return null;
}

export const CONFIRM_CLASH_ERROR = "Another booking is already confirmed for some of these dates. Cancel this request, or ask the renter for other dates.";

/** True when confirming `b` would overlap a booking already confirmed or handed over. */
export async function confirmClash(b: BookingLike): Promise<boolean> {
  const on = sameVehicle(b);
  if (!on) return false;
  return !!(await Booking.exists({ ...on, _id: { $ne: b._id }, ...holdsDatesQuery(), ...bookingClashQuery(b.startDate, b.endDate) }));
}

/** Cancels the other waiting requests for `b`'s days and tells their renters. Never throws; returns how many. */
export async function cancelClashingRequests(b: BookingLike): Promise<number> {
  const on = sameVehicle(b);
  if (!on) return 0;
  try {
    const others = await Booking.find({ ...on, _id: { $ne: b._id }, status: "PENDING", ...bookingClashQuery(b.startDate, b.endDate) })
      .select("renterId").lean<{ _id: mongoose.Types.ObjectId; renterId?: mongoose.Types.ObjectId }[]>();
    if (!others.length) return 0;
    await Booking.updateMany(
      { _id: { $in: others.map(o => o._id) }, status: "PENDING" },
      { $set: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "DATES_TAKEN", seenByRenter: false } }
    );
    const renters = [...new Set(others.map(o => o.renterId?.toString()).filter(Boolean))];
    await Promise.all(renters.map(id => triggerPusher(`user-${id}`, "new-notification", { type: "booking", status: "CANCELLED", reason: "DATES_TAKEN" })));
    return others.length;
  } catch (error) {
    reportError("Cancel clashing requests:", error);
    return 0;
  }
}
