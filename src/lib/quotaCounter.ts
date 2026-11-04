// Server-only. Monthly allowances (the listing and deal quota, boosts) taken one slot at a time without races.
//
// Writing an entry first and counting after is not enough: of two requests sent at once, each can count before the
// other's entry lands and both pass, or each can see the other and both give up. Here one counter document per
// account per month is raised by MongoDB in a single atomic step, and only while it is below the limit, so exactly
// the allowance gets through however many requests arrive together.
//
// The counter is first lifted to the real usage counted from the records ($max), which seeds it at the start of a
// month and catches up on anything counted another way (posts made before the counter existed, a member who joined
// the team mid-month). It never goes down except through release(), when the thing it was taken for failed to save.
import { QuotaCounter } from "@/models/QuotaCounter";
import { quotaMonthStart, quotaResetsAt } from "@/lib/plans";

const DAY = 86_400_000;

/** The counter's key for an account (`org:<id>` or `user:<id>`) and allowance this month, e.g. "listings:org:…:2026-11". */
export function quotaKey(kind: "listings" | "boosts", account: string, now = new Date()): string {
  const m = quotaMonthStart(now);
  // quotaMonthStart is midnight on the 1st in Pakistan, i.e. 19:00 UTC the day before: name the month from the reset day
  const pk = new Date(m.getTime() + 5 * 3_600_000);
  return `${kind}:${account}:${pk.getUTCFullYear()}-${String(pk.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Takes one slot. `usage` is what the records say is already used (before this one); `limit` null means no limit (the
 * slot is still counted, so a later lower plan starts from the right number). True when the slot was taken.
 */
export async function claimQuota(key: string, usage: number, limit: number | null, now = new Date()): Promise<boolean> {
  const expiresAt = new Date(quotaResetsAt(now).getTime() + 7 * DAY);
  try {
    await QuotaCounter.updateOne({ key }, { $max: { count: usage }, $setOnInsert: { expiresAt } }, { upsert: true });
  } catch (e) {
    // Two first requests of the month upserting at once: one gets a duplicate key error, and the document now exists
    if ((e as { code?: number }).code !== 11000) throw e;
    await QuotaCounter.updateOne({ key }, { $max: { count: usage } });
  }
  const taken = await QuotaCounter.findOneAndUpdate(
    limit === null ? { key } : { key, count: { $lt: limit } },
    { $inc: { count: 1 } },
    { returnDocument: "after" }
  ).lean();
  return !!taken;
}

/** Gives a slot back (the listing, deal or boost it was taken for wasn't saved). */
export async function releaseQuota(key: string): Promise<void> {
  await QuotaCounter.updateOne({ key, count: { $gt: 0 } }, { $inc: { count: -1 } });
}
