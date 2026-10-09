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

/** Whole days between two dates, rounded up, with a minimum of one day. */
export function rentalDays(start: Date | string, end: Date | string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
