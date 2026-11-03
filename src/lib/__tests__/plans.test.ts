import { describe, expect, it } from "vitest";
import { addPlanPeriods, effectivePlanId, isFreeGrant, PLAN_FEATURE_LIST, PLAN_FEATURES, PLAN_LIST, PLAN_PERIOD_DAYS, planFor, planHas, quotaMonthStart, quotaResetsAt } from "@/lib/plans";

describe("effectivePlanId", () => {
  const future = new Date(Date.now() + 86_400_000);
  const past = new Date(Date.now() - 86_400_000);
  it("keeps a running paid plan", () => {
    expect(effectivePlanId("PRO", future)).toBe("PRO");
  });
  it("falls back to Free when the plan has ended or is unknown", () => {
    expect(effectivePlanId("PRO", past)).toBe("FREE");
    expect(effectivePlanId("GOLD", future)).toBe("FREE");
    expect(effectivePlanId(undefined)).toBe("FREE");
  });
});

describe("plan periods", () => {
  it("adds whole 30-day periods", () => {
    const from = new Date("2026-10-01T00:00:00Z");
    expect(addPlanPeriods(from, 2).getTime() - from.getTime()).toBe(2 * PLAN_PERIOD_DAYS * 86_400_000);
  });
  it("treats gifts and trials as revocable, paid plans as not", () => {
    expect(isFreeGrant("ADMIN_GRANT")).toBe(true);
    expect(isFreeGrant("TRIAL")).toBe(true);
    expect(isFreeGrant("PAID")).toBe(false);
  });
});

describe("listing quota month", () => {
  it("follows Pakistan time: 1 am on 1 Nov in Karachi is already November", () => {
    const now = new Date("2026-10-31T20:00:00Z"); // 01:00 on 1 Nov in Pakistan
    expect(quotaMonthStart(now).toISOString()).toBe("2026-10-31T19:00:00.000Z");
    expect(quotaResetsAt(now).toISOString()).toBe("2026-11-30T19:00:00.000Z");
  });
});

describe("plan features", () => {
  it("gives each plan its advertised features and everything below it", () => {
    expect(planHas("FREE", "messaging")).toBe(true);
    expect(planHas("FREE", "rentals")).toBe(true);
    expect(planHas("FREE", "salesReports")).toBe(false);
    expect(planHas("STARTER", "salesReports")).toBe(true);
    expect(planHas("STARTER", "prioritySupport")).toBe(false);
    expect(planHas("PRO", "prioritySupport")).toBe(true);
    expect(planHas("PRO", "dedicatedSupport")).toBe(false);
    for (const f of PLAN_FEATURE_LIST) expect(planHas("UNLIMITED", f)).toBe(true);
    expect(planFor("prioritySupport").name).toBe("Premium Plus");
  });

  it("matches the features each plan card lists", () => {
    for (const plan of PLAN_LIST) {
      for (const f of PLAN_FEATURE_LIST) {
        // A card that names a feature must include it (cards may leave out lower-plan features they inherit)
        if (plan.features.includes(PLAN_FEATURES[f].label)) expect(planHas(plan.id, f), `${plan.name}: ${f}`).toBe(true);
      }
    }
  });
});
