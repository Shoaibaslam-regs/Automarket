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

/** A renter may bring the vehicle back this late without charge. */
export const LATE_GRACE_MINUTES = 60;
/** Each late day is charged at this multiple of the booking's daily rate. */
export const LATE_RATE_MULTIPLIER = 2;

/** The booking's own daily rate: the rent divided by the days booked (works for listings, deals and off-list vehicles). */
export function bookingDailyRate(b: { totalAmount: number; startDate: Date | string; endDate: Date | string }): number {
  return Math.round(b.totalAmount / rentalDays(b.startDate, b.endDate));
}

/**
 * The charge for bringing a vehicle back after the return time the owner set at handover.
 * Up to LATE_GRACE_MINUTES late is free. After that every started 24 hours (each with the same grace)
 * counts as one extra day at LATE_RATE_MULTIPLIER times the daily rate:
 * due 4:00 pm, back 4:50 pm → free; back 5:30 pm → 1 day; back 4:30 pm next day → 1 day; 5:30 pm next day → 2 days.
 */
export function lateCharge(dueBackAt: Date | string | undefined | null, returnedAt: Date | string, dailyRate: number) {
  if (!dueBackAt) return { lateMinutes: 0, lateDays: 0, fee: 0 };
  const lateMs = new Date(returnedAt).getTime() - new Date(dueBackAt).getTime();
  const lateMinutes = Math.max(0, Math.round(lateMs / 60000));
  const graceMs = LATE_GRACE_MINUTES * 60 * 1000;
  const lateDays = lateMs <= graceMs ? 0 : Math.ceil((lateMs - graceMs) / DAY_MS);
  return { lateMinutes, lateDays, fee: lateDays * dailyRate * LATE_RATE_MULTIPLIER };
}

/** Short rule text shown to owners and renters. */
export const LATE_RULE_TEXT = `Up to ${LATE_GRACE_MINUTES / 60} hour late is free. After that, each extra day is charged at ${LATE_RATE_MULTIPLIER}× the daily rate.`;
