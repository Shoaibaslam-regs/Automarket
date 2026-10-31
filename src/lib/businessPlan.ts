// Client-safe rules for a business's plan over time (private sellers keep the Free plan without limit of time):
// - a new business gets the Free plan for BUSINESS_FREE_DAYS, once (businesses from before this rule until
//   BUSINESS_FREE_GRACE_UNTIL);
// - once that time is over, or once the account has had any trial or paid plan, Free is gone for good: when the
//   plan ends the business is LAPSED and can't add listings, deals, staff or customers until it subscribes again
//   (bookings, sales, customers, money and its live listings keep working);
// - reminders go out 7, 3 and 1 day before a plan (or the free start) ends, and on the day it ends.

const DAY = 86_400_000;

export const BUSINESS_FREE_DAYS = 30;
/** Businesses that existed before the rule keep the Free plan until this date (end of 30 Nov, Pakistan time). */
export const BUSINESS_FREE_GRACE_UNTIL = new Date("2026-12-01T00:00:00+05:00");

export type BusinessPlanState = "PLAN" | "FREE_START" | "LAPSED";

export type BusinessPlanStatus = {
  state: BusinessPlanState;
  /** When the plan (or the free start) ends, or ended for a lapsed business */
  endsAt: Date;
  /** Whole days left (0 on the last day or once lapsed) */
  daysLeft: number;
};

/** When a business's one-time free start ends. */
export function businessFreeUntil(orgCreatedAt: Date | string): Date {
  const own = new Date(orgCreatedAt).getTime() + BUSINESS_FREE_DAYS * DAY;
  return new Date(Math.max(own, BUSINESS_FREE_GRACE_UNTIL.getTime()));
}

/** True once the account has had any trial, gift or paid plan (even long ago): Free never comes back after that. */
export function everHadPlan(owner: { plan?: string | null; planSource?: string | null; trialUsedAt?: Date | string | null }): boolean {
  return !!owner.trialUsedAt || !!owner.planSource || (!!owner.plan && owner.plan !== "FREE");
}

export const daysLeftUntil = (endsAt: Date, now = new Date()) => Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / DAY));

/**
 * Where a business stands, from its owner's plan (`effectivePlan` is effectivePlanId of it) and the business's
 * creation date.
 */
export function businessPlanStatus(input: {
  effectivePlan: string;
  planExpiresAt?: Date | string | null;
  owner: { plan?: string | null; planSource?: string | null; trialUsedAt?: Date | string | null };
  orgCreatedAt: Date | string;
  now?: Date;
}): BusinessPlanStatus {
  const now = input.now ?? new Date();
  if (input.effectivePlan !== "FREE" && input.planExpiresAt) {
    const endsAt = new Date(input.planExpiresAt);
    return { state: "PLAN", endsAt, daysLeft: daysLeftUntil(endsAt, now) };
  }
  const freeUntil = businessFreeUntil(input.orgCreatedAt);
  const hadPlan = everHadPlan(input.owner);
  if (!hadPlan && freeUntil.getTime() > now.getTime()) return { state: "FREE_START", endsAt: freeUntil, daysLeft: daysLeftUntil(freeUntil, now) };
  // Lapsed since its last plan ended, or since the free start ended
  const endedAt = hadPlan && input.planExpiresAt ? new Date(input.planExpiresAt) : freeUntil;
  return { state: "LAPSED", endsAt: endedAt, daysLeft: 0 };
}

/** The reminder points before an end: 7, 3 and 1 day(s), and 0 for the day it ended. */
export const REMINDER_STAGES = [7, 3, 1, 0] as const;
export type ReminderStage = (typeof REMINDER_STAGES)[number];
/** An "it has ended" reminder is still sent if the job runs within this long after the end. */
const ENDED_WINDOW = 3 * DAY;

/** Which reminder is due now for something ending at `endsAt` (the latest stage reached), or null. */
export function reminderStage(endsAt: Date, now = new Date()): ReminderStage | null {
  const ms = endsAt.getTime() - now.getTime();
  if (ms <= 0) return -ms <= ENDED_WINDOW ? 0 : null;
  const days = Math.ceil(ms / DAY);
  if (days <= 1) return 1;
  if (days <= 3) return 3;
  if (days <= 7) return 7;
  return null;
}

/** "ends in 3 days", "ends tomorrow", "ends today", "has ended". */
export function endsInText(endsAt: Date, now = new Date()): string {
  const ms = endsAt.getTime() - now.getTime();
  if (ms <= 0) return "has ended";
  const days = Math.ceil(ms / DAY);
  if (ms < 12 * 3_600_000 && new Date(endsAt.getTime() + 5 * 3_600_000).toISOString().slice(0, 10) === new Date(now.getTime() + 5 * 3_600_000).toISOString().slice(0, 10)) return "ends today";
  if (days <= 1) return "ends tomorrow";
  return `ends in ${days} days`;
}

export type PlanNotice = { tone: "warn" | "danger"; title: string; body: string; action: string };

/**
 * What the console's reminder, the dashboard banner and Notifications say about a plan: from 7 days before it
 * (or the business's free month) ends, and while a business is lapsed. Null when there is nothing to say yet.
 * `business` false is a private seller's own plan, which falls back to Free.
 */
export function planNotice(p: { state: BusinessPlanState; endsAt: Date | string; planName: string; business: boolean }, now = new Date()): PlanNotice | null {
  const endsAt = new Date(p.endsAt);
  const left = endsAt.getTime() - now.getTime();
  const after = p.business
    ? "your shop and bookings keep working, but nothing new can be added until you subscribe"
    : "your account moves to the Free plan";
  if (p.state === "LAPSED") {
    return {
      tone: "danger",
      title: everHadPlanText(p) ? `Your ${p.planName} plan has ended` : "Your business's free month has ended",
      body: "Your shop and bookings keep working, but you can't add new listings, deals, staff or customers until you subscribe.",
      action: "Subscribe now",
    };
  }
  if (left > 7 * DAY) return null;
  const what = p.state === "FREE_START" ? "Your business's free month" : `Your ${p.planName} plan`;
  return {
    tone: left <= 3 * DAY ? "danger" : "warn",
    title: `${what} ${endsInText(endsAt, now)}`,
    body: p.state === "FREE_START"
      ? `Choose a plan to keep adding listings, deals, staff and customers. After it ends ${after}.`
      : `Renew to keep everything running. After it ends ${after}.`,
    action: p.state === "FREE_START" ? "Choose a plan" : "Renew now",
  };
}
// A lapsed business whose last plan has a name had a plan; one still called "Free" only had its free month
const everHadPlanText = (p: { planName: string }) => p.planName !== "Free";
