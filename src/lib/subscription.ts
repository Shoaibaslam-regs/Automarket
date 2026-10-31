import mongoose from "mongoose";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { Employee } from "@/models/Employee";
import { Customer } from "@/models/Customer";
import { Listing } from "@/models/Listing";
import { getInventorySellerIds } from "@/lib/business";
import { PLANS, effectivePlanId, formatLimit, quotaMonthStart, quotaResetsAt, type Plan, type PlanId, type PlanSource } from "@/lib/plans";
import { ListingLog } from "@/models/ListingLog";
import { Deal } from "@/models/Deal";
import { businessPlanStatus, type BusinessPlanStatus } from "@/lib/businessPlan";

type PlanFields = {
  _id: mongoose.Types.ObjectId;
  plan?: string;
  planExpiresAt?: Date;
  planSource?: PlanSource;
  organizationId?: mongoose.Types.ObjectId;
  trialUsedAt?: Date;
};

export type Subscription = {
  planId: PlanId;
  plan: Plan;
  /** The plan stored on the account, which may differ from planId once it has expired */
  storedPlanId: string;
  expiresAt: Date | null;
  source: PlanSource | null;
  /** Business members share their owner's plan */
  inheritedFromOwner: boolean;
  organizationId: mongoose.Types.ObjectId | null;
  /**
   * Businesses only (src/lib/businessPlan.ts): on a plan, in the one-time free start, or LAPSED, when nothing new can
   * be added until the owner subscribes. Null for private sellers, who keep the Free plan.
   */
  business: BusinessPlanStatus | null;
};

export type LimitKind = "listings" | "staff" | "customers";
export type Usage = Record<LimitKind, number>;

const PLAN_SELECT = "plan planExpiresAt planSource organizationId trialUsedAt";

/**
 * The plan in force for a user. Members of a business use the business owner's plan,
 * so a whole team shares one subscription.
 */
export async function getSubscription(userId: string): Promise<Subscription> {
  const user = await User.findById(userId).select(PLAN_SELECT).lean<PlanFields>();
  let billing: PlanFields | null = user;
  let inheritedFromOwner = false;
  let orgCreatedAt: Date | null = null;

  if (user?.organizationId) {
    const org = await Organization.findById(user.organizationId).select("ownerId createdAt").lean<{ ownerId: mongoose.Types.ObjectId; createdAt: Date }>();
    if (org) orgCreatedAt = org.createdAt;
    if (org && !org.ownerId.equals(user._id)) {
      billing = await User.findById(org.ownerId).select(PLAN_SELECT).lean<PlanFields>();
      inheritedFromOwner = true;
    }
  }

  const planId = effectivePlanId(billing?.plan, billing?.planExpiresAt);
  const business = orgCreatedAt
    ? businessPlanStatus({ effectivePlan: planId, planExpiresAt: billing?.planExpiresAt, owner: billing ?? {}, orgCreatedAt })
    : null;
  return {
    planId,
    plan: PLANS[planId],
    storedPlanId: billing?.plan || "FREE",
    expiresAt: planId === "FREE" ? null : billing?.planExpiresAt ?? null,
    source: planId === "FREE" ? null : billing?.planSource ?? null,
    inheritedFromOwner,
    organizationId: user?.organizationId ?? null,
    business,
  };
}

/**
 * Listings and deals created this quota month by the account (the whole team for a business), deleted ones
 * included. They share one quota. Anything posted before the log existed is counted from the documents themselves.
 */
async function listingsThisMonth(sellerIds: mongoose.Types.ObjectId[]): Promise<number> {
  const since = quotaMonthStart();
  const logs = await ListingLog.find({ sellerId: { $in: sellerIds }, createdAt: { $gte: since } }).select("listingId dealId").lean<Array<{ listingId?: mongoose.Types.ObjectId; dealId?: mongoose.Types.ObjectId }>>();
  const loggedListings = logs.flatMap(l => (l.listingId ? [l.listingId] : []));
  const loggedDeals = logs.flatMap(l => (l.dealId ? [l.dealId] : []));
  const [unloggedListings, unloggedDeals] = await Promise.all([
    Listing.countDocuments({ sellerId: { $in: sellerIds }, createdAt: { $gte: since }, _id: { $nin: loggedListings } }),
    Deal.countDocuments({ createdBy: { $in: sellerIds }, createdAt: { $gte: since }, _id: { $nin: loggedDeals } }),
  ]);
  return logs.length + unloggedListings + unloggedDeals;
}

export async function getUsage(userId: string, sub: Subscription): Promise<Usage> {
  const sellerIds = await getInventorySellerIds(userId);
  const [listings, staff, customers] = await Promise.all([
    listingsThisMonth(sellerIds),
    sub.organizationId ? Employee.countDocuments({ organizationId: sub.organizationId }) : Promise.resolve(1),
    sub.organizationId ? Customer.countDocuments({ organizationId: sub.organizationId }) : Promise.resolve(0),
  ]);
  return { listings, staff, customers };
}

const LIMIT_NOUNS: Record<LimitKind, string> = {
  listings: "new listings and deals a month",
  staff: "team members",
  customers: "customers",
};

/**
 * Checks whether adding one more `kind` stays within the plan.
 * Returns null when allowed, otherwise a 403 payload the client can show with an upgrade link.
 */
function limitReached(sub: Subscription, kind: LimitKind, limit: number, used: number) {
  const resets = kind === "listings"
    ? ` Your quota resets on ${quotaResetsAt().toLocaleDateString("en-PK", { day: "numeric", month: "short", timeZone: "Asia/Karachi" })}.`
    : "";
  return {
    error: `Your ${sub.plan.name} plan allows ${formatLimit(limit)} ${LIMIT_NOUNS[kind]}.${resets} Upgrade your plan to add more.`,
    code: "PLAN_LIMIT_REACHED",
    kind,
    limit,
    used,
    plan: sub.planId,
  };
}

/**
 * A lapsed business adds nothing new until it subscribes (src/lib/businessPlan.ts). Same code as a reached limit, so
 * the forms' upgrade prompts show; `lapsed` tells them apart.
 */
function planLapsed(sub: Subscription, kind: LimitKind) {
  const when = sub.business!.endsAt.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" });
  return {
    error: `Your business's plan ended on ${when}. Subscribe to a plan to add new ${kind === "listings" ? "listings and deals" : kind === "staff" ? "team members" : "customers"}. Everything else keeps working.`,
    code: "PLAN_LIMIT_REACHED",
    lapsed: true,
    kind,
    limit: 0,
    used: 0,
    plan: sub.planId,
  };
}

export async function checkPlanLimit(userId: string, kind: LimitKind) {
  const sub = await getSubscription(userId);
  if (sub.business?.state === "LAPSED") return planLapsed(sub, kind);
  const limit = sub.plan.limits[kind];
  if (limit === null) return null;
  const used = (await getUsage(userId, sub))[kind];
  if (used < limit) return null;
  return limitReached(sub, kind, limit, used);
}

/**
 * Takes one slot of the monthly listing quota for a listing or deal that is about to be created (pass the id it
 * will be created with). The ListingLog entry is written first and the month counted after, so requests sent at
 * the same moment can't all pass a count taken before any of them was logged; whoever ends up over the limit
 * removes its own entry and is refused. Call `release()` if the listing or deal then fails to save, so a failed
 * attempt doesn't use up quota. (Entries are otherwise never deleted.)
 */
export async function reserveListingSlot(userId: string, target: { listingId: mongoose.Types.ObjectId } | { dealId: mongoose.Types.ObjectId }) {
  const sub = await getSubscription(userId);
  if (sub.business?.state === "LAPSED") return { ok: false as const, error: planLapsed(sub, "listings") };
  const limit = sub.plan.limits.listings;
  const log = await ListingLog.create({ sellerId: userId, ...target });
  const release = () => ListingLog.deleteOne({ _id: log._id }).then(() => undefined, () => undefined);
  if (limit === null) return { ok: true as const, release };
  const used = (await getUsage(userId, sub)).listings;
  if (used <= limit) return { ok: true as const, release };
  await release();
  return { ok: false as const, error: limitReached(sub, "listings", limit, used - 1) };
}
