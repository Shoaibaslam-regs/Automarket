import mongoose, { type ClientSession } from "mongoose";
import { LedgerEntry } from "@/models/LedgerEntry";
import { getMembership } from "@/lib/business";
import { reportError } from "@/lib/errorLog";

type Ref = { bookingId?: unknown; purchaseId?: unknown; listingId?: unknown; vehicleLabel?: string };
const asId = (v: unknown) => (v && mongoose.Types.ObjectId.isValid(String(v)) ? new mongoose.Types.ObjectId(String(v)) : undefined);
type Write = { session?: ClientSession };

// Transactions need a replica set (Atlas always is one); a local standalone mongod isn't, so check once
let txSupport: Promise<boolean> | null = null;
function supportsTransactions(): Promise<boolean> {
  txSupport ??= (async () => {
    try {
      const hello = await mongoose.connection.db!.admin().command({ hello: 1 });
      return !!hello.setName || hello.msg === "isdbgrid";
    } catch {
      txSupport = null;
      return false;
    }
  })();
  return txSupport;
}

/**
 * Runs a payment change and its cash book entry as one transaction, so a payment is never saved without its
 * entry (or the other way round). Pass the session to every write inside, including recordPaymentChange and
 * recordOut, which then throw instead of swallowing errors so the whole change rolls back.
 * MongoDB may retry `fn` on a write conflict, so it must only write, not send messages.
 * Without a replica set (local development) it runs `fn` without a session.
 *   await moneyTransaction(async session => { await sale.save({ session }); await recordPaymentChange(..., { session }); });
 */
export async function moneyTransaction<T>(fn: (session?: ClientSession) => Promise<T>): Promise<T> {
  if (!(await supportsTransactions())) return fn(undefined);
  return mongoose.connection.transaction(session => fn(session));
}

/**
 * Writes the cash book entry for a payment change. `change` is the new total minus the old one:
 * money received is IN under `inCategory`; a lowered total is OUT as a payment correction.
 * Only for business members (personal owners have no cash book).
 * Never throws, unless it's part of a moneyTransaction (`session` given), where a failure must roll the payment back.
 */
export async function recordPaymentChange(userId: string, change: number, inCategory: "BOOKING_PAYMENT" | "SALE_PAYMENT" | "INSTALLMENT", ref: Ref, note?: string, { session }: Write = {}) {
  try {
    if (!Number.isFinite(change) || Math.round(change) === 0) return;
    const member = await getMembership(userId);
    if (!member) return;
    await LedgerEntry.create([{
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
    }], { session });
  } catch (e) {
    if (session) throw e;
    reportError("Cash book entry failed:", e);
  }
}

/** An automatic OUT entry (e.g. a deposit refund). Never throws, except inside a moneyTransaction (see above). */
export async function recordOut(userId: string, organizationId: unknown, category: string, amount: number, ref: Ref, note?: string, { session }: Write = {}) {
  try {
    if (!Number.isFinite(amount) || amount < 1) return;
    await LedgerEntry.create([{
      organizationId, type: "OUT", category, amount: Math.round(amount), date: new Date(), note,
      bookingId: asId(ref.bookingId), purchaseId: asId(ref.purchaseId), listingId: asId(ref.listingId), vehicleLabel: ref.vehicleLabel,
      source: "AUTO", createdBy: userId,
    }], { session });
  } catch (e) {
    if (session) throw e;
    reportError("Cash book entry failed:", e);
  }
}
