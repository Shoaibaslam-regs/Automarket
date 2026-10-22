import { Ad } from "@/models/Ad";

/** Ads that are over: refused, cancelled, stopped, or approved and past their end. Only these can be cleared. */
export const finishedAdFilter = (now = new Date()) => ({
  $or: [{ status: { $in: ["REJECTED", "CANCELLED", "STOPPED"] } }, { status: "APPROVED", endsAt: { $lte: now } }],
});

/**
 * Clears finished ads from one side's history (`scope` narrows it, e.g. to one business). Each side only hides
 * its own copy, so a business clearing its list keeps the admin's payment records; a record is deleted once
 * both sides have cleared it. Returns how many were cleared.
 */
export async function clearAdHistory(side: "business" | "admin", scope: Record<string, unknown> = {}): Promise<number> {
  const field = side === "business" ? "hiddenByBusiness" : "hiddenByAdmin";
  const res = await Ad.updateMany({ ...scope, ...finishedAdFilter(), [field]: { $ne: true } }, { $set: { [field]: true } });
  await Ad.deleteMany({ ...scope, hiddenByBusiness: true, hiddenByAdmin: true });
  return res.modifiedCount;
}
