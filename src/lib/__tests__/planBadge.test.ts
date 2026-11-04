import { describe, expect, it } from "vitest";
import { planBadgeUpdate } from "@/lib/planBadge";

const now = new Date("2026-11-04T12:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);

describe("planBadgeUpdate", () => {
  it("gives a business without a badge the plan's badge until the plan ends", () => {
    const u = planBadgeUpdate(null, days(30), now)!;
    expect(u.source).toBe("PLAN");
    expect(u.expiresAt).toEqual(days(30));
    expect(u.verifiedAt).toEqual(now);
  });

  it("leaves a paid badge that outlasts the plan alone", () => {
    expect(planBadgeUpdate({ verifiedAt: days(-10), expiresAt: days(60), source: "PAID" }, days(30), now)).toBeNull();
  });

  it("covers a shorter paid badge with the plan, remembering the paid end", () => {
    const u = planBadgeUpdate({ verifiedAt: days(-10), expiresAt: days(5), source: "PAID" }, days(30), now)!;
    expect(u).toMatchObject({ source: "PLAN", expiresAt: days(30), paidUntil: days(5), paidSource: "PAID" });
    expect(u.verifiedAt).toEqual(days(-10));
  });

  it("follows a renewal", () => {
    const u = planBadgeUpdate({ verifiedAt: days(-1), expiresAt: days(30), source: "PLAN" }, days(60), now)!;
    expect(u.expiresAt).toEqual(days(60));
    expect(planBadgeUpdate({ verifiedAt: days(-1), expiresAt: days(30), source: "PLAN" }, days(30), now)).toBeNull();
  });

  it("ends the plan's badge when the plan stops, or goes back to a paid badge still running", () => {
    expect(planBadgeUpdate({ verifiedAt: days(-1), expiresAt: days(30), source: "PLAN" }, null, now)).toMatchObject({ expiresAt: now });
    expect(planBadgeUpdate({ verifiedAt: days(-1), expiresAt: days(30), source: "PLAN", paidUntil: days(10), paidSource: "ADMIN_GRANT" }, null, now))
      .toMatchObject({ expiresAt: days(10), source: "ADMIN_GRANT" });
  });

  it("never touches a paid badge when the plan doesn't include one", () => {
    expect(planBadgeUpdate({ verifiedAt: days(-1), expiresAt: days(30), source: "PAID" }, null, now)).toBeNull();
    expect(planBadgeUpdate(null, null, now)).toBeNull();
  });
});
