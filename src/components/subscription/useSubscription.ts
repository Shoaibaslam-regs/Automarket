"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlanId, PlanLimits, PlanSource } from "@/lib/plans";

export type SubscriptionInfo = {
  planId: PlanId;
  storedPlanId: string;
  expiresAt: string | null;
  source: PlanSource | null;
  inheritedFromOwner: boolean;
  hasBusiness: boolean;
  limits: PlanLimits;
  usage: { listings: number; staff: number; customers: number };
  /** The listing limit is monthly; when the count starts again */
  listingsResetAt?: string;
  /** Days until the paid plan ends and the account is back on Free; null on Free */
  planDaysLeft?: number | null;
  /** Businesses: on a plan, in the one-time free start, or lapsed (src/lib/businessPlan.ts); null for private sellers */
  business?: { state: "PLAN" | "FREE_START" | "LAPSED"; endsAt: string; daysLeft: number; role: string | null } | null;
};

/** Loads /api/subscription. Pass `enabled: false` for signed-out visitors so no request is made. */
export function useSubscription(enabled = true) {
  const [data, setData] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(enabled);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/subscription");
      setData(res.ok ? await res.json() : null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // Fetch in a microtask so the effect body itself never sets state synchronously
    queueMicrotask(refresh);
  }, [enabled, refresh]);

  return { data, loading: enabled && loading, refresh };
}

/** True once `used` has reached a finite `limit`. */
export function atLimit(used: number, limit: number | null) {
  return limit !== null && used >= limit;
}
