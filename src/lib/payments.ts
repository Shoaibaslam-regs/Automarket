// Client-safe booking payment helpers. The owner records how much the renter has paid;
// the tag (pending, partly paid, paid) is worked out from that amount and what the booking costs.

export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID";

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Payment pending",
  PARTIAL: "Partly paid",
  PAID: "Paid",
};

type Payable = { totalAmount: number; deposit: number; lateFee?: number; amountPaid?: number };

/** Everything the renter owes: rent, deposit and any late-return fee. */
export function amountDue(b: Payable): number {
  return b.totalAmount + b.deposit + (b.lateFee ?? 0);
}

/**
 * The payment tag and balance. A booking marked paid becomes "partly paid" again if a late fee is added later,
 * because the tag always compares what was paid with what is owed now.
 */
export function paymentState(b: Payable): { status: PaymentStatus; paid: number; due: number; balance: number } {
  const due = amountDue(b);
  const paid = Math.max(0, b.amountPaid ?? 0);
  const status: PaymentStatus = paid <= 0 ? "PENDING" : paid >= due ? "PAID" : "PARTIAL";
  return { status, paid, due, balance: Math.max(0, due - paid) };
}
