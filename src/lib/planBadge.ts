// Client-safe: the Verified badge that comes with a plan (PLAN_FEATURES.verifiedIncluded, Ultimate). It is stored on
// Organization.verification like any badge (source "PLAN"), so every page that shows ticks keeps working. A badge the
// business paid for (or was gifted) is never shortened: its own end is kept in `paidUntil` and comes back if the plan
// stops first.
import { isVerified, type BadgeVerification } from "@/lib/plans";

export type PlanBadgeState = BadgeVerification & {
  paidUntil?: Date | string | null;
  paidSource?: "PAID" | "ADMIN_GRANT" | null;
};

export type PlanBadgeUpdate = {
  verifiedAt?: Date;
  expiresAt: Date;
  source: "PAID" | "ADMIN_GRANT" | "PLAN";
  paidUntil?: Date | null;
  paidSource?: "PAID" | "ADMIN_GRANT" | null;
} | null;

const time = (d?: Date | string | null) => (d ? new Date(d).getTime() : 0);

/**
 * What a business's badge should become after its owner's plan changes. `planEnd` is when the plan that includes the
 * badge ends, or null when the plan doesn't include it (any other plan, an ended plan, Free). Null means leave it.
 */
export function planBadgeUpdate(v: PlanBadgeState | null | undefined, planEnd: Date | null, now = new Date()): PlanBadgeUpdate {
  const fromPlan = v?.source === "PLAN";
  if (planEnd && planEnd.getTime() > now.getTime()) {
    // Already the plan's badge: follow the plan's end, or the paid end if that is later
    if (fromPlan) {
      const end = Math.max(planEnd.getTime(), time(v?.paidUntil));
      return time(v?.expiresAt) === end ? null : { expiresAt: new Date(end), source: "PLAN", paidUntil: v?.paidUntil ? new Date(v.paidUntil) : null, paidSource: v?.paidSource ?? null };
    }
    // A paid or gifted badge that already lasts longer than the plan: nothing to add
    if (isVerified(v, now) && time(v?.expiresAt) >= planEnd.getTime()) return null;
    const running = isVerified(v, now);
    return {
      verifiedAt: running && v?.verifiedAt ? new Date(v.verifiedAt) : now,
      expiresAt: planEnd,
      source: "PLAN",
      paidUntil: running && v?.expiresAt ? new Date(v.expiresAt) : null,
      paidSource: running ? (v?.source as "PAID" | "ADMIN_GRANT" | undefined) ?? null : null,
    };
  }
  if (!fromPlan) return null;
  // The plan no longer includes it: back to the paid badge if it still has time, else end it now
  if (time(v?.paidUntil) > now.getTime()) return { expiresAt: new Date(v!.paidUntil!), source: v?.paidSource ?? "PAID", paidUntil: null, paidSource: null };
  return time(v?.expiresAt) > now.getTime() ? { expiresAt: now, source: "PLAN", paidUntil: null, paidSource: null } : null;
}
