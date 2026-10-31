// Server-only. The daily job's reminders before something paid ends, and when it has (runDailyJobs):
// - plans (paid, gifts and trials): 7, 3 and 1 day before, and the day it ended;
// - a new business's one-time free month: the same stages;
// - the Verified badge: 3 days before and when it ended;
// - sponsored ads: the day before and when it ended.
// Each goes to the owner by email and to the owner and managers as a phone notification; on the day something ends
// the owner also gets a message from AutoGO Support, which they can answer with a payment receipt. Every stage is
// sent once per end date (claimed in the document before sending), so a second run or a renewal never repeats one.

import mongoose from "mongoose";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { Employee } from "@/models/Employee";
import { Ad } from "@/models/Ad";
import { sendPush } from "@/lib/push";
import { sendReminderEmail } from "@/lib/email";
import { getSupportAdmin, sendChatMessage } from "@/lib/support";
import { planInfo, PLANS } from "@/lib/plans";
import { BUSINESS_FREE_DAYS, BUSINESS_FREE_GRACE_UNTIL, businessFreeUntil, everHadPlan, reminderStage, type ReminderStage } from "@/lib/businessPlan";
import { reportError } from "@/lib/errorLog";

type Oid = mongoose.Types.ObjectId;
const DAY = 86_400_000;
/** At most this many of each kind per run, so the job stays inside Vercel's 30 s */
const MAX_PER_KIND = 100;

const day = (d: Date) => d.toLocaleDateString("en-PK", { day: "numeric", month: "long", timeZone: "Asia/Karachi" });
const leftText = (stage: ReminderStage) => (stage === 1 ? "ends tomorrow" : `ends in ${stage} days`);

async function inBatches<T>(items: T[], size: number, fn: (item: T) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn));
}

/**
 * Claims one reminder stage for one document and end date: true only for the run that records it. A new end date
 * (a renewal, a new period) starts the list again.
 */
async function claimStage(
  model: mongoose.Model<never>,
  id: Oid,
  forField: string,
  sentField: string,
  endsAt: Date,
  stage: ReminderStage
): Promise<boolean> {
  const fresh = await model.updateOne({ _id: id, [forField]: { $ne: endsAt } } as never, { $set: { [forField]: endsAt, [sentField]: [stage] } } as never);
  if (fresh.modifiedCount) return true;
  const next = await model.updateOne({ _id: id, [forField]: endsAt, [sentField]: { $ne: stage } } as never, { $addToSet: { [sentField]: stage } } as never);
  return next.modifiedCount > 0;
}

/** The owner and managers of a business, who hear about its plan, badge and ads. */
async function deciders(orgId: Oid): Promise<Oid[]> {
  const rows = await Employee.find({ organizationId: orgId, role: { $in: ["OWNER", "MANAGER"] } }).select("userId").lean<{ userId: Oid }[]>();
  return rows.map(r => r.userId);
}

type Reminder = {
  ownerId: Oid;
  /** Who else gets the phone notification (managers) */
  team: Oid[];
  email?: string;
  name?: string;
  stage: ReminderStage;
  title: string;
  lines: string[];
  kicker: string;
  path: string;
  button: string;
  tag: string;
};

/** Sends one reminder: email to the owner, a phone notification to the team, and on the end day a support message. */
async function deliver(r: Reminder) {
  if (r.email) {
    try {
      await sendReminderEmail({ to: r.email, name: r.name, subject: r.title, kicker: r.kicker, lines: r.lines, button: { path: r.path, label: r.button } });
    } catch (e) {
      reportError("Expiry reminder email failed:", e);
    }
  }
  // On the end day the owner hears through AutoGO Support's message (which notifies them itself)
  const pushTo = r.stage === 0 ? r.team.filter(id => !id.equals(r.ownerId)) : [r.ownerId, ...r.team.filter(id => !id.equals(r.ownerId))];
  await sendPush(pushTo, { title: r.title, body: r.lines[0], url: r.path, tag: r.tag });
  if (r.stage === 0) {
    try {
      const support = await getSupportAdmin();
      await sendChatMessage(String(support._id), String(r.ownerId), `${r.title}. ${r.lines.join(" ")} Reply here with your payment receipt and the team will switch it on.`, "AutoGO Support");
    } catch (e) {
      reportError("Expiry reminder message failed:", e);
    }
  }
}

/** Paid, gifted and trial plans ending within 7 days, or that ended within the last 3. */
async function planReminders(now: Date): Promise<number> {
  const users = await User.find({
    plan: { $ne: "FREE" },
    planExpiresAt: { $gt: new Date(now.getTime() - 3 * DAY), $lte: new Date(now.getTime() + 7 * DAY) },
  }).select("name email plan planExpiresAt planReminderFor planRemindersSent").limit(MAX_PER_KIND * 3)
    .lean<Array<{ _id: Oid; name?: string; email: string; plan: string; planExpiresAt: Date; planReminderFor?: Date; planRemindersSent?: number[] }>>();

  let sent = 0;
  await inBatches(users, 5, async u => {
    if (sent >= MAX_PER_KIND) return;
    const stage = reminderStage(u.planExpiresAt, now);
    if (stage === null) return;
    if (u.planReminderFor?.getTime() === u.planExpiresAt.getTime() && u.planRemindersSent?.includes(stage)) return;
    if (!(await claimStage(User as never, u._id, "planReminderFor", "planRemindersSent", u.planExpiresAt, stage))) return;

    const org = await Organization.findOne({ ownerId: u._id }).select("_id").lean<{ _id: Oid }>();
    const plan = planInfo(u.plan).name;
    const when = day(u.planExpiresAt);
    // Businesses don't fall back to Free (src/lib/businessPlan.ts); private sellers do
    const after = org
      ? "After it ends your shop and bookings keep working, but you can't add new listings, deals, staff or customers until you subscribe again."
      : `After it ends your account moves to the Free plan (${PLANS.FREE.limits.listings} listings a month).`;
    await deliver({
      ownerId: u._id,
      team: org ? await deciders(org._id) : [],
      email: u.email,
      name: u.name,
      stage,
      title: stage === 0 ? `Your ${plan} plan has ended` : `Your ${plan} plan ${leftText(stage)}`,
      lines: stage === 0
        ? [org ? "Your shop and bookings keep working, but you can't add new listings, deals, staff or customers until you subscribe again." : `Your account is on the Free plan now (${PLANS.FREE.limits.listings} listings a month).`, "Renew to switch everything back on."]
        : [`Renew before ${when} to keep everything running.`, after],
      kicker: "Plan reminder",
      path: "/pricing",
      button: stage === 0 ? "Renew my plan" : "Renew now",
      tag: "plan-expiry",
    });
    sent++;
  });
  return sent;
}

/** A new business's one-time free month ending within 7 days, or that ended within the last 3 (owner never had a plan). */
async function freeStartReminders(now: Date): Promise<number> {
  // freeUntil is the later of creation + 30 days and the grace date, so look at businesses whose own 30 days end in
  // the window, and at the older ones while the grace date is in it
  const windowStart = now.getTime() - 3 * DAY, windowEnd = now.getTime() + 7 * DAY;
  const created = { $gt: new Date(windowStart - BUSINESS_FREE_DAYS * DAY), $lte: new Date(windowEnd - BUSINESS_FREE_DAYS * DAY) };
  const graceInWindow = BUSINESS_FREE_GRACE_UNTIL.getTime() > windowStart && BUSINESS_FREE_GRACE_UNTIL.getTime() <= windowEnd;
  const orgs = await Organization.find({
    isActive: { $ne: false },
    $or: [{ createdAt: created }, ...(graceInWindow ? [{ createdAt: { $lte: new Date(BUSINESS_FREE_GRACE_UNTIL.getTime() - BUSINESS_FREE_DAYS * DAY) } }] : [])],
  }).select("ownerId createdAt freeReminderFor freeRemindersSent").limit(MAX_PER_KIND * 3)
    .lean<Array<{ _id: Oid; ownerId: Oid; createdAt: Date; freeReminderFor?: Date; freeRemindersSent?: number[] }>>();

  let sent = 0;
  await inBatches(orgs, 5, async o => {
    if (sent >= MAX_PER_KIND) return;
    const endsAt = businessFreeUntil(o.createdAt);
    const stage = reminderStage(endsAt, now);
    if (stage === null) return;
    if (o.freeReminderFor?.getTime() === endsAt.getTime() && o.freeRemindersSent?.includes(stage)) return;
    const owner = await User.findById(o.ownerId).select("name email plan planSource trialUsedAt planExpiresAt").lean<{ name?: string; email: string; plan?: string; planSource?: string; trialUsedAt?: Date; planExpiresAt?: Date }>();
    // Only while the business is still on its free start: a plan (or a past one) has its own reminders
    if (!owner || everHadPlan(owner)) return;
    if (!(await claimStage(Organization as never, o._id, "freeReminderFor", "freeRemindersSent", endsAt, stage))) return;
    await deliver({
      ownerId: o.ownerId,
      team: await deciders(o._id),
      email: owner.email,
      name: owner.name,
      stage,
      title: stage === 0 ? "Your business's free month has ended" : `Your business's free month ${leftText(stage)}`,
      lines: stage === 0
        ? ["Your shop and bookings keep working, but you can't add new listings, deals, staff or customers until you choose a plan.", "Pick a plan to switch everything back on."]
        : [`Choose a plan before ${day(endsAt)} to keep adding listings, deals, staff and customers.`, "After it ends your shop and bookings keep working, but nothing new can be added until you subscribe."],
      kicker: "Plan reminder",
      path: "/pricing",
      button: "Choose a plan",
      tag: "plan-expiry",
    });
    sent++;
  });
  return sent;
}

/** Verified badges ending within 3 days, or that ended within the last 3 (stages 3 and 0 only). */
async function badgeReminders(now: Date): Promise<number> {
  const orgs = await Organization.find({
    isActive: { $ne: false },
    "verification.expiresAt": { $gt: new Date(now.getTime() - 3 * DAY), $lte: new Date(now.getTime() + 3 * DAY) },
  }).select("ownerId verification.expiresAt verification.reminderFor verification.remindersSent").limit(MAX_PER_KIND)
    .lean<Array<{ _id: Oid; ownerId: Oid; verification: { expiresAt: Date; reminderFor?: Date; remindersSent?: number[] } }>>();

  let sent = 0;
  await inBatches(orgs, 5, async o => {
    const raw = reminderStage(o.verification.expiresAt, now);
    const stage: ReminderStage | null = raw === 0 ? 0 : raw === 1 || raw === 3 ? 3 : null;
    if (stage === null) return;
    if (!(await claimStage(Organization as never, o._id, "verification.reminderFor", "verification.remindersSent", o.verification.expiresAt, stage))) return;
    const owner = await User.findById(o.ownerId).select("name email").lean<{ name?: string; email: string }>();
    await deliver({
      ownerId: o.ownerId,
      team: await deciders(o._id),
      email: owner?.email,
      name: owner?.name,
      stage,
      title: stage === 0 ? "Your Verified badge has ended" : `Your Verified badge ends on ${day(o.verification.expiresAt)}`,
      lines: stage === 0
        ? ["The Verified tick is gone from your shop page and listings.", "Renew it to bring it back."]
        : ["Renew it to keep the Verified tick on your shop page and listings."],
      kicker: "Verified badge",
      path: "/pricing",
      button: "Renew the badge",
      tag: "badge-expiry",
    });
    sent++;
  });
  return sent;
}

/** Approved sponsored ads ending within a day, or that ended within the last 3 (stages 1 and 0 only). */
async function adReminders(now: Date): Promise<number> {
  const ads = await Ad.find({
    status: "APPROVED",
    endsAt: { $gt: new Date(now.getTime() - 3 * DAY), $lte: new Date(now.getTime() + DAY) },
  }).select("organizationId targetLabel endsAt reminderFor remindersSent").limit(MAX_PER_KIND)
    .lean<Array<{ _id: Oid; organizationId: Oid; targetLabel: string; endsAt: Date; reminderFor?: Date; remindersSent?: number[] }>>();

  let sent = 0;
  await inBatches(ads, 5, async a => {
    const raw = reminderStage(a.endsAt, now);
    const stage: ReminderStage | null = raw === 0 ? 0 : raw === 1 ? 1 : null;
    if (stage === null) return;
    if (!(await claimStage(Ad as never, a._id, "reminderFor", "remindersSent", a.endsAt, stage))) return;
    const org = await Organization.findById(a.organizationId).select("ownerId").lean<{ ownerId: Oid }>();
    if (!org) return;
    const owner = await User.findById(org.ownerId).select("name email").lean<{ name?: string; email: string }>();
    await deliver({
      ownerId: org.ownerId,
      team: await deciders(a.organizationId),
      email: owner?.email,
      name: owner?.name,
      stage,
      title: stage === 0 ? `Your sponsored ad for "${a.targetLabel}" has ended` : `Your sponsored ad for "${a.targetLabel}" ends tomorrow`,
      lines: stage === 0 ? ["It no longer shows to buyers.", "Book another week to keep it in front of them."] : ["Book another week to keep it in front of buyers."],
      kicker: "Sponsored ad",
      path: "/business/promote",
      button: "Promote again",
      tag: "ad-expiry",
    });
    sent++;
  });
  return sent;
}

/** Every expiry reminder due today; one kind failing doesn't stop the others. */
export async function sendExpiryReminders(now = new Date()) {
  const run = async (name: string, fn: (now: Date) => Promise<number>) => {
    try {
      return await fn(now);
    } catch (e) {
      reportError(`Expiry reminders (${name}) failed:`, e);
      return -1;
    }
  };
  return {
    plans: await run("plans", planReminders),
    freeStart: await run("free start", freeStartReminders),
    badges: await run("badges", badgeReminders),
    ads: await run("ads", adReminders),
  };
}
