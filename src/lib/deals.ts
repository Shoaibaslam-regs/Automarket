// Client-safe deal helpers shared by the deals API, business console, listing page and admin.

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

export const DEAL_STATE_STYLE: Record<DealState, { label: string; color: string; bg: string }> = {
  LIVE: { label: "Live", color: "#1a7f37", bg: "#dafbe1" },
  SCHEDULED: { label: "Scheduled", color: "#0550ae", bg: "#ddf4ff" },
  EXPIRED: { label: "Ended", color: "#57606a", bg: "#f6f8fa" },
  PAUSED: { label: "Paused", color: "#7d4e00", bg: "#fff8c5" },
  DISABLED: { label: "Disabled by admin", color: "#cf222e", bg: "#fff0f0" },
};
