// Client-safe helpers for direct purchases (a buyer requests a business's vehicle, the business sells it).

import { paymentStateFor } from "@/lib/payments";

export const PURCHASE_STATUSES = ["REQUESTED", "ACCEPTED", "COMPLETED", "DECLINED", "CANCELLED"] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

/** Requests still in progress: the buyer can cancel and the business can act on them. */
export const OPEN_PURCHASE_STATUSES: PurchaseStatus[] = ["REQUESTED", "ACCEPTED"];

export const PURCHASE_LABEL: Record<PurchaseStatus, string> = {
  REQUESTED: "Requested",
  ACCEPTED: "Accepted",
  COMPLETED: "Sold",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};

/** Theme colours for each status pill. */
export const PURCHASE_STYLE: Record<PurchaseStatus, { bg: string; color: string }> = {
  REQUESTED: { bg: "var(--gh-fff8c5)", color: "var(--gh-7d4e00)" },
  ACCEPTED: { bg: "var(--gh-ddf4ff)", color: "var(--gh-0550ae)" },
  COMPLETED: { bg: "var(--gh-dafbe1)", color: "var(--gh-1a7f37)" },
  DECLINED: { bg: "var(--gh-fff0f0)", color: "var(--gh-cf222e)" },
  CANCELLED: { bg: "var(--gh-f6f8fa)", color: "var(--gh-57606a)" },
};

/** Short reference printed on slips and records, from the purchase id. */
export function purchaseNumber(id: string): string {
  return `SL-${id.slice(-6).toUpperCase()}`;
}

type Priced = { askingPrice: number; offerPrice?: number; agreedPrice?: number; amountPaid?: number };

/** The price the sale is for: agreed, else the buyer's offer, else the asking price. */
export function salePrice(p: Priced): number {
  return p.agreedPrice ?? p.offerPrice ?? p.askingPrice;
}

/** Payment tag and balance for a purchase (same rules as bookings). */
export function purchasePayment(p: Priced) {
  return paymentStateFor(salePrice(p), p.amountPaid);
}

/** The shape PaymentTag/PaymentDialog read, so purchases reuse the booking payment UI. */
export function asPayable(p: Priced) {
  return { totalAmount: salePrice(p), deposit: 0, amountPaid: p.amountPaid };
}
