// Client-safe deal helpers shared by the deals API, business console, public deal pages and admin.

export type DealLike = {
  discountType: "PERCENT" | "AMOUNT";
  discountValue: number;
  startsAt: Date | string;
  endsAt: Date | string;
  paused?: boolean;
  disabledByAdmin?: boolean;
};

export type DealState = "LIVE" | "SCHEDULED" | "EXPIRED" | "PAUSED" | "DISABLED";

export const MAX_PERCENT = 90;
export const MAX_DEAL_IMAGES = 10;

/** Rent deals are bookable packages priced per day; deals saved before the type existed are sales. */
export const isRentDeal = (d: { dealType?: string | null }) => d.dealType === "RENT";

/** Days left until a deal ends, counting today; 0 once it has ended. */
export function daysLeft(endsAt: Date | string, now = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - now) / 86_400_000));
}

export function dealState(d: DealLike, now = Date.now()): DealState {
  if (d.disabledByAdmin) return "DISABLED";
  if (d.paused) return "PAUSED";
  if (new Date(d.endsAt).getTime() < now) return "EXPIRED";
  if (new Date(d.startsAt).getTime() > now) return "SCHEDULED";
  return "LIVE";
}

/** "15% off" or "PKR 50,000 off" */
export function dealLabel(d: Pick<DealLike, "discountType" | "discountValue">): string {
  return d.discountType === "PERCENT" ? `${d.discountValue}% off` : `PKR ${d.discountValue.toLocaleString()} off`;
}

/** Sale price after the deal, never below zero. */
export function dealPrice(price: number, d: Pick<DealLike, "discountType" | "discountValue">): number {
  const off = d.discountType === "PERCENT" ? Math.round((price * d.discountValue) / 100) : d.discountValue;
  return Math.max(0, price - off);
}

/** Inline styles for state badges; theme variables, so they adapt to dark mode */
export const DEAL_STATE_STYLE: Record<DealState, { label: string; color: string; bg: string }> = {
  LIVE: { label: "Live", color: "var(--gh-1a7f37)", bg: "var(--gh-dafbe1)" },
  SCHEDULED: { label: "Scheduled", color: "var(--gh-0550ae)", bg: "var(--gh-ddf4ff)" },
  EXPIRED: { label: "Ended", color: "var(--gh-57606a)", bg: "var(--gh-f6f8fa)" },
  PAUSED: { label: "Paused", color: "var(--gh-7d4e00)", bg: "var(--gh-fff8c5)" },
  DISABLED: { label: "Disabled by admin", color: "var(--gh-cf222e)", bg: "var(--gh-fff0f0)" },
};
