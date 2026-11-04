// Server-only. Boosts (rules in client-safe src/lib/boosts.ts): who may boost, the monthly allowance, starting one and
// keeping running ones in step with the plan.
import mongoose from "mongoose";
import { BoostLog } from "@/models/BoostLog";
import { Listing } from "@/models/Listing";
import { Deal } from "@/models/Deal";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { can, getMembership, getOrgUserIds } from "@/lib/business";
import { getSubscription } from "@/lib/subscription";
import { effectivePlanId, planFor, quotaMonthStart, quotaResetsAt, type PlanId } from "@/lib/plans";
import { boostAllowance, boostEnds, isBoosted } from "@/lib/boosts";
import { liveQuery } from "@/lib/publicDeals";
import { invalidateDeal } from "@/lib/pageCache";
import { reportError } from "@/lib/errorLog";
import { claimQuota, quotaKey, releaseQuota } from "@/lib/quotaCounter";
import { logBusinessAction } from "@/lib/businessLog";

type Oid = mongoose.Types.ObjectId;

/** Whose allowance a user spends: their business's (its owner's plan) or, for a private seller, their own. */
async function boostAccount(userId: string) {
  const [member, sub] = await Promise.all([getMembership(userId), getSubscription(userId)]);
  return { member, sub, account: member ? `org:${member.organizationId}` : `user:${userId}` };
}

export type BoostStatus = {
  allowed: boolean;
  /** The cheapest plan with boosts, for "Boosts come with Premium Plus" */
  plan: string;
  perMonth: number;
  days: number;
  used: number;
  left: number;
  resetsAt: string;
  /** Whether this person may press Boost (business owners and managers; private sellers for their own) */
  canBoost: boolean;
};

/** This month's boosts for the person's business or account. */
export async function boostStatus(userId: string): Promise<BoostStatus> {
  const { member, sub, account } = await boostAccount(userId);
  const allowance = boostAllowance(sub.planId);
  const used = allowance ? await BoostLog.countDocuments({ account, createdAt: { $gte: quotaMonthStart() } }) : 0;
  return {
    allowed: !!allowance,
    plan: planFor("boost").name,
    perMonth: allowance?.perMonth ?? 0,
    days: allowance?.days ?? 0,
    used,
    left: Math.max(0, (allowance?.perMonth ?? 0) - used),
    resetsAt: quotaResetsAt().toISOString(),
    canBoost: !!allowance && (!member || can(member.role, "promote")),
  };
}

type Outcome = { ok: true; until: Date; left: number } | { ok: false; status: number; error: string; code?: string };

/**
 * Boosts one vehicle (`listingId`, active, sold or rented by the user or their team) or one live deal of their
 * business, taking one of the month's boosts on an atomic counter first.
 */
export async function startBoost(userId: string, target: { listingId?: string; dealId?: string }): Promise<Outcome> {
  const { member, sub, account } = await boostAccount(userId);
  const allowance = boostAllowance(sub.planId);
  if (!allowance) return { ok: false, status: 403, code: "PLAN_FEATURE", error: `Boosts come with ${planFor("boost").name} and up` };
  if (member && !can(member.role, "promote")) return { ok: false, status: 403, error: "Only the owner or a manager can boost" };
  const id = target.listingId ?? target.dealId;
  if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) return { ok: false, status: 400, error: "Choose a vehicle or deal" };
  const now = new Date();

  let item: { _id: Oid; boostedUntil?: Date; organizationId?: Oid } | null;
  if (target.listingId) {
    const sellers = member ? await getOrgUserIds(member.organizationId) : [new mongoose.Types.ObjectId(userId)];
    item = await Listing.findOne({ _id: id, sellerId: { $in: sellers }, status: "ACTIVE" }).select("boostedUntil").lean();
    if (!item) return { ok: false, status: 404, error: "Only your own vehicles that are live can be boosted" };
  } else {
    if (!member) return { ok: false, status: 403, error: "Deals belong to businesses" };
    item = await Deal.findOne({ _id: id, organizationId: member.organizationId, ...liveQuery(now) }).select("boostedUntil organizationId").lean();
    if (!item) return { ok: false, status: 404, error: "Only your business's live deals can be boosted" };
  }
  if (isBoosted(item.boostedUntil, now)) {
    return { ok: false, status: 409, error: `Already boosted until ${new Date(item.boostedUntil!).toLocaleDateString("en-PK", { day: "numeric", month: "short", timeZone: "Asia/Karachi" })}` };
  }

  const ends = boostEnds(sub.planId, sub.expiresAt, now)!;
  // The month's allowance is taken on an atomic counter (src/lib/quotaCounter.ts), so boosts sent at the same moment
  // can't pass it together; the log is written after and never removed, so a deleted post's boost stays used
  const key = quotaKey("boosts", account, now);
  const used = await BoostLog.countDocuments({ account, createdAt: { $gte: quotaMonthStart(now) } });
  if (!(await claimQuota(key, used, allowance.perMonth, now))) {
    return { ok: false, status: 403, code: "BOOSTS_USED", error: `You've used all ${allowance.perMonth} boosts this month. They come back on the 1st.` };
  }
  // Start it only if it isn't already running (checked in the same step, so two presses at once use one boost)
  const notRunning = { _id: id, $or: [{ boostedUntil: null }, { boostedUntil: { $lte: now } }] };
  const started = target.listingId
    ? await Listing.updateOne({ ...notRunning, status: "ACTIVE" }, { $set: { boostedUntil: ends.until } })
    : await Deal.updateOne(notRunning, { $set: { boostedUntil: ends.until } });
  if (!started.modifiedCount) {
    await releaseQuota(key).catch(() => undefined);
    return { ok: false, status: 409, error: "It's already boosted" };
  }
  try {
    await BoostLog.create({ account, by: userId, fullUntil: ends.full, ...(target.listingId ? { listingId: id } : { dealId: id }) });
  } catch (e) {
    // Keep the counter and the item in step with the log: no log, no boost
    await releaseQuota(key).catch(() => undefined);
    if (target.listingId) await Listing.updateOne({ _id: id }, { $unset: { boostedUntil: 1 } }).catch(() => undefined);
    else await Deal.updateOne({ _id: id }, { $unset: { boostedUntil: 1 } }).catch(() => undefined);
    throw e;
  }
  const left = Math.max(0, allowance.perMonth - (await BoostLog.countDocuments({ account, createdAt: { $gte: quotaMonthStart(now) } })));
  if (target.dealId) await invalidateDeal(id, item.organizationId);
  if (member) {
    await logBusinessAction({ userId, organizationId: member.organizationId }, target.listingId ? "listing.boost" : "deal.boost",
      { type: target.listingId ? "LISTING" : "DEAL", id }, { details: `Until ${ends.until.toLocaleDateString("en-PK", { day: "numeric", month: "short", timeZone: "Asia/Karachi" })}` });
  }
  return { ok: true, until: ends.until, left };
}

/**
 * After a plan change: running boosts follow the plan. On a plan with boosts they run to their full length or the
 * plan's end, whichever is first (so a renewal lets them run on); on any other plan they stop now. Never throws.
 */
export async function syncBoosts(ownerId: string | Oid): Promise<void> {
  try {
    const owner = await User.findById(ownerId).select("plan planExpiresAt").lean<{ plan?: string; planExpiresAt?: Date }>();
    if (!owner) return;
    const plan: PlanId = effectivePlanId(owner.plan, owner.planExpiresAt);
    const org = await Organization.findOne({ ownerId }).select("_id").lean<{ _id: Oid }>();
    const accounts = [`user:${ownerId}`, ...(org ? [`org:${org._id}`] : [])];
    const now = new Date();
    const logs = await BoostLog.find({ account: { $in: accounts }, fullUntil: { $gt: now } }).lean<Array<{ listingId?: Oid; dealId?: Oid; fullUntil: Date }>>();
    const planEnd = owner.planExpiresAt ? new Date(owner.planExpiresAt) : null;
    for (const l of logs) {
      const until = boostAllowance(plan) ? (planEnd && planEnd < l.fullUntil ? planEnd : l.fullUntil) : now;
      if (l.listingId) await Listing.updateOne({ _id: l.listingId, boostedUntil: { $gt: now } }, { $set: { boostedUntil: until } });
      if (l.dealId) await Deal.updateOne({ _id: l.dealId, boostedUntil: { $gt: now } }, { $set: { boostedUntil: until } });
    }
  } catch (error) {
    reportError("Boost sync failed:", error);
  }
}
