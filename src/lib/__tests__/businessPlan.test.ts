import { describe, expect, it } from "vitest";
import { BUSINESS_FREE_GRACE_UNTIL, businessFreeUntil, businessPlanStatus, endsInText, everHadPlan, planNotice, reminderStage } from "@/lib/businessPlan";

const DAY = 86_400_000;
const now = new Date("2026-12-10T07:00:00Z");

describe("the one-time free start", () => {
  it("lasts 30 days from the business's creation", () => {
    expect(businessFreeUntil("2026-12-05T00:00:00Z").toISOString()).toBe("2027-01-04T00:00:00.000Z");
  });
  it("runs until the grace date for businesses from before the rule", () => {
    expect(businessFreeUntil("2026-03-01T00:00:00Z").getTime()).toBe(BUSINESS_FREE_GRACE_UNTIL.getTime());
  });
});

describe("everHadPlan", () => {
  it("notices any trial, gift or paid plan, even an expired one", () => {
    expect(everHadPlan({ plan: "FREE" })).toBe(false);
    expect(everHadPlan({ plan: "STARTER" })).toBe(true);
    expect(everHadPlan({ plan: "FREE", planSource: "TRIAL" })).toBe(true);
    expect(everHadPlan({ plan: "FREE", trialUsedAt: "2026-01-01" })).toBe(true);
  });
});

describe("businessPlanStatus", () => {
  const owner = { plan: "FREE" };
  it("is on its plan while a paid plan runs", () => {
    const s = businessPlanStatus({ effectivePlan: "PRO", planExpiresAt: new Date(now.getTime() + 5 * DAY), owner: { plan: "PRO", planSource: "PAID" }, orgCreatedAt: "2026-01-01", now });
    expect(s).toMatchObject({ state: "PLAN", daysLeft: 5 });
  });
  it("is in its free start during its first 30 days", () => {
    const s = businessPlanStatus({ effectivePlan: "FREE", owner, orgCreatedAt: new Date(now.getTime() - 10 * DAY), now });
    expect(s).toMatchObject({ state: "FREE_START", daysLeft: 20 });
  });
  it("lapses once the free start is over", () => {
    expect(businessPlanStatus({ effectivePlan: "FREE", owner, orgCreatedAt: new Date(now.getTime() - 40 * DAY), now }).state).toBe("LAPSED");
  });
  it("never falls back to Free after a trial or paid plan, even within the first 30 days", () => {
    const ended = new Date(now.getTime() - DAY);
    const s = businessPlanStatus({ effectivePlan: "FREE", planExpiresAt: ended, owner: { plan: "STARTER", planSource: "TRIAL", trialUsedAt: "2026-12-01" }, orgCreatedAt: new Date(now.getTime() - 5 * DAY), now });
    expect(s).toEqual({ state: "LAPSED", endsAt: ended, daysLeft: 0 });
  });
});

describe("reminders", () => {
  const ends = new Date("2026-12-20T07:00:00Z");
  const at = (daysBefore: number) => new Date(ends.getTime() - daysBefore * DAY);
  it("are due 7, 3 and 1 day before, and on the day it ended", () => {
    expect(reminderStage(ends, at(10))).toBeNull();
    expect(reminderStage(ends, at(7))).toBe(7);
    expect(reminderStage(ends, at(5))).toBe(7);
    expect(reminderStage(ends, at(3))).toBe(3);
    expect(reminderStage(ends, at(2))).toBe(3);
    expect(reminderStage(ends, at(1))).toBe(1);
    expect(reminderStage(ends, at(0.2))).toBe(1);
    expect(reminderStage(ends, at(-1))).toBe(0);
    expect(reminderStage(ends, at(-5))).toBeNull();
  });
  it("say how long is left", () => {
    expect(endsInText(ends, at(3))).toBe("ends in 3 days");
    expect(endsInText(ends, at(0.9))).toBe("ends tomorrow");
    expect(endsInText(ends, at(0.1))).toBe("ends today");
    expect(endsInText(ends, at(-1))).toBe("has ended");
  });
});

describe("planNotice", () => {
  const ends = new Date("2026-12-20T07:00:00Z");
  const at = (daysBefore: number) => new Date(ends.getTime() - daysBefore * DAY);
  it("says nothing until a week before", () => {
    expect(planNotice({ state: "PLAN", endsAt: ends, planName: "Premium", business: true }, at(10))).toBeNull();
  });
  it("warns a week before, more strongly in the last three days", () => {
    expect(planNotice({ state: "PLAN", endsAt: ends, planName: "Premium", business: true }, at(6))).toMatchObject({ tone: "warn", title: "Your Premium plan ends in 6 days", action: "Renew now" });
    expect(planNotice({ state: "PLAN", endsAt: ends, planName: "Premium", business: true }, at(2))!.tone).toBe("danger");
  });
  it("tells a business it can't add anything once lapsed, and a private seller about Free", () => {
    expect(planNotice({ state: "LAPSED", endsAt: ends, planName: "Premium", business: true }, at(-1))).toMatchObject({ tone: "danger", title: "Your Premium plan has ended" });
    expect(planNotice({ state: "LAPSED", endsAt: ends, planName: "Free", business: true }, at(-1))!.title).toBe("Your business's free month has ended");
    expect(planNotice({ state: "PLAN", endsAt: ends, planName: "Premium", business: false }, at(2))!.body).toMatch(/moves to the Free plan/);
  });
  it("names the free month", () => {
    expect(planNotice({ state: "FREE_START", endsAt: ends, planName: "Free", business: true }, at(3))).toMatchObject({ title: "Your business's free month ends in 3 days", action: "Choose a plan" });
  });
});
