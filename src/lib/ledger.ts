import mongoose from "mongoose";
import { LedgerEntry } from "@/models/LedgerEntry";
import { getMembership } from "@/lib/business";

type Ref = { bookingId?: unknown; purchaseId?: unknown; listingId?: unknown; vehicleLabel?: string };
const asId = (v: unknown) => (v && mongoose.Types.ObjectId.isValid(String(v)) ? new mongoose.Types.ObjectId(String(v)) : undefined);

/**
 * Writes the cash book entry for a payment change. `change` is the new total minus the old one:
 * money received is IN under `inCategory`; a lowered total is OUT as a payment correction.
 * Only for business members (personal owners have no cash book). Never throws.
 */
export async function recordPaymentChange(userId: string, change: number, inCategory: "BOOKING_PAYMENT" | "SALE_PAYMENT" | "INSTALLMENT", ref: Ref, note?: string) {
  try {
    if (!Number.isFinite(change) || Math.round(change) === 0) return;
    const member = await getMembership(userId);
    if (!member) return;
    await LedgerEntry.create({
      organizationId: member.organizationId,
      type: change > 0 ? "IN" : "OUT",
      category: change > 0 ? inCategory : "PAYMENT_CORRECTION",
      amount: Math.abs(Math.round(change)),
      date: new Date(),
      note,
      bookingId: asId(ref.bookingId),
      purchaseId: asId(ref.purchaseId),
      listingId: asId(ref.listingId),
      vehicleLabel: ref.vehicleLabel,
      source: "AUTO",
      createdBy: userId,
    });
  } catch (e) {
    console.error("Cash book entry failed:", e);
  }
}

/** An automatic OUT entry (e.g. a deposit refund). Never throws. */
export async function recordOut(userId: string, organizationId: unknown, category: string, amount: number, ref: Ref, note?: string) {
  try {
    if (!Number.isFinite(amount) || amount < 1) return;
    await LedgerEntry.create({
      organizationId, type: "OUT", category, amount: Math.round(amount), date: new Date(), note,
      bookingId: asId(ref.bookingId), purchaseId: asId(ref.purchaseId), listingId: asId(ref.listingId), vehicleLabel: ref.vehicleLabel,
      source: "AUTO", createdBy: userId,
    });
  } catch (e) {
    console.error("Cash book entry failed:", e);
  }
}
