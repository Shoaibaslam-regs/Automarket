// Client-safe booking helpers shared by the business bookings API, page and slip.

export const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/**
 * Allowed status changes. ACTIVE means the vehicle has been handed over;
 * a booking can't be cancelled once the vehicle is out.
 */
export const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: string, to: string): boolean {
  return (BOOKING_TRANSITIONS[from as BookingStatus] ?? []).includes(to as BookingStatus);
}

/** Short reference printed on slips and shown in lists, derived from the booking id. */
export function bookingNumber(id: string): string {
  return `BK-${id.slice(-6).toUpperCase()}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Days charged: whole days from pickup to return, at least one. A same-day return (pickup and return
 * on 23 Oct) and a next-morning return (23 → 24 Oct) are both one day.
 */
export function rentalDays(start: Date | string, end: Date | string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(ms / DAY_MS));
}

/** A return date can be the pickup day itself, but not before it. */
export function validBookingDates(start: Date | string, end: Date | string): boolean {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return !isNaN(s) && !isNaN(e) && e >= s;
}

/**
 * Bookings on the same vehicle or deal that clash with a new one from `start` to `end`.
 * A booking holds the vehicle from its pickup day up to (not including) its return day, and a same-day
 * booking holds just that day. So the return day is free for the next pickup: 23 → 24 Oct and 24 → 25 Oct
 * don't clash, and neither do two separate same-day bookings on 23 and 24 Oct.
 */
export function bookingClashQuery(start: Date, end: Date) {
  const newHeldUntil = new Date(Math.max(end.getTime(), start.getTime() + DAY_MS));
  return {
    startDate: { $lt: newHeldUntil },
    // The existing booking still holds the vehicle on `start` if it returns later, or is a same-day booking from `start` on
    $or: [{ endDate: { $gt: start } }, { startDate: { $gte: start } }],
  };
}
