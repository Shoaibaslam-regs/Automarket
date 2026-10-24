// The steps a customer's request goes through, shown as a progress line when it is sent (RequestSent) and on each
// card in My bookings and My purchases (StepTrack). Client-safe.

export type RequestSteps = {
  steps: string[];
  /** Index of the last step reached (0 = just requested) */
  reached: number;
};

const BOOKING_REACHED: Record<string, number> = { PENDING: 0, CONFIRMED: 1, ACTIVE: 2, COMPLETED: 3 };
const PURCHASE_REACHED: Record<string, number> = { REQUESTED: 0, ACCEPTED: 1, COMPLETED: 2 };

/** A booking: requested → confirmed (by the owner or the business) → picked up → returned. Short labels, so four
 *  fit across a phone card. Null when it was cancelled or declined, which its status already says. */
export function bookingSteps(status: string): RequestSteps | null {
  const reached = BOOKING_REACHED[status];
  if (reached === undefined) return null;
  return { steps: ["Requested", "Confirmed", "Picked up", "Returned"], reached };
}

/** A purchase request: requested → price agreed (accepted) → sold. Null when declined or cancelled. */
export function purchaseSteps(status: string): RequestSteps | null {
  const reached = PURCHASE_REACHED[status];
  if (reached === undefined) return null;
  return { steps: ["Requested", "Price agreed", "Sold"], reached };
}
