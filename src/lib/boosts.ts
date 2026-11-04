// Client-safe: Boost (PLAN_FEATURES.boost, Premium Plus and up). A business or seller on such a plan pushes a vehicle
// (for sale or rent) or a deal to the top of Marketplace or the Deals page for PLAN_BOOSTS[plan].days, up to
// PLAN_BOOSTS[plan].perMonth times a calendar month (Pakistan time, like the listing quota). A used boost stays used.
import { PLAN_BOOSTS, type PlanId } from "@/lib/plans";

const DAY = 86_400_000;

/** How many boosted vehicles the first page of a Marketplace search leads with, picked afresh so they take turns. */
export const BOOSTED_SHOWN = 4;

/** The boost allowance a plan gives, or null when it has none. */
export function boostAllowance(planId: PlanId): { perMonth: number; days: number } | null {
  return PLAN_BOOSTS[planId] ?? null;
}

/**
 * When a boost started now ends: its full length, cut to the plan's end so it never outlives the plan (renewing the
 * plan lets it run its full length again). `full` is the uncut end, kept to extend it on renewal.
 */
export function boostEnds(planId: PlanId, planEnd: Date | string | null | undefined, now = new Date()): { until: Date; full: Date } | null {
  const a = boostAllowance(planId);
  if (!a) return null;
  const full = new Date(now.getTime() + a.days * DAY);
  const end = planEnd ? new Date(planEnd) : null;
  return { full, until: end && end.getTime() < full.getTime() ? end : full };
}

/** A boost still running. */
export function isBoosted(until: Date | string | null | undefined, now = new Date()): boolean {
  return !!until && new Date(until).getTime() > now.getTime();
}

/** Picks up to `n` of the items at random (Fisher–Yates on a copy), so boosted vehicles share the top places. */
export function pickBoosted<T>(items: T[], n = BOOSTED_SHOWN, random = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

/** Boosted items first, keeping each group's own order (the Deals page). */
export function boostedFirst<T extends { boostedUntil?: Date | string | null }>(items: T[], now = new Date()): T[] {
  return [...items.filter(i => isBoosted(i.boostedUntil, now)), ...items.filter(i => !isBoosted(i.boostedUntil, now))];
}
