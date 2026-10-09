import mongoose from "mongoose";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { Employee } from "@/models/Employee";
import { Customer } from "@/models/Customer";
import { Listing } from "@/models/Listing";
import { getInventorySellerIds } from "@/lib/business";
import { PLANS, SLOT_STATUSES, effectivePlanId, formatLimit, type Plan, type PlanId } from "@/lib/plans";

type PlanFields = {
  _id: mongoose.Types.ObjectId;
  plan?: string;
  planExpiresAt?: Date;
  planSource?: "PAID" | "ADMIN_GRANT";
  organizationId?: mongoose.Types.ObjectId;
};

export type Subscription = {
  planId: PlanId;
  plan: Plan;
  /** The plan stored on the account, which may differ from planId once it has expired */
  storedPlanId: string;
  expiresAt: Date | null;
  source: "PAID" | "ADMIN_GRANT" | null;
  /** Business members share their owner's plan */
  inheritedFromOwner: boolean;
  organizationId: mongoose.Types.ObjectId | null;
};

export type LimitKind = "listings" | "staff" | "customers";
export type Usage = Record<LimitKind, number>;

const PLAN_SELECT = "plan planExpiresAt planSource organizationId";

/**
 * The plan in force for a user. Members of a business use the business owner's plan,
 * so a whole team shares one subscription.
 */
export async function getSubscription(userId: string): Promise<Subscription> {
  const user = await User.findById(userId).select(PLAN_SELECT).lean<PlanFields>();
  let billing: PlanFields | null = user;
  let inheritedFromOwner = false;

  if (user?.organizationId) {
    const org = await Organization.findById(user.organizationId).select("ownerId").lean<{ ownerId: mongoose.Types.ObjectId }>();
    if (org && !org.ownerId.equals(user._id)) {
      billing = await User.findById(org.ownerId).select(PLAN_SELECT).lean<PlanFields>();
      inheritedFromOwner = true;
    }
  }

  const planId = effectivePlanId(billing?.plan, billing?.planExpiresAt);
  return {
    planId,
    plan: PLANS[planId],
    storedPlanId: billing?.plan || "FREE",
    expiresAt: planId === "FREE" ? null : billing?.planExpiresAt ?? null,
    source: planId === "FREE" ? null : billing?.planSource ?? null,
    inheritedFromOwner,
    organizationId: user?.organizationId ?? null,
  };
}

export async function getUsage(userId: string, sub: Subscription): Promise<Usage> {
  const sellerIds = await getInventorySellerIds(userId);
  const [listings, staff, customers] = await Promise.all([
    Listing.countDocuments({ sellerId: { $in: sellerIds }, status: { $in: SLOT_STATUSES } }),
    sub.organizationId ? Employee.countDocuments({ organizationId: sub.organizationId }) : Promise.resolve(1),
    sub.organizationId ? Customer.countDocuments({ organizationId: sub.organizationId }) : Promise.resolve(0),
  ]);
  return { listings, staff, customers };
}

const LIMIT_NOUNS: Record<LimitKind, string> = {
  listings: "active listings",
  staff: "team members",
  customers: "customers",
};

/**
 * Checks whether adding one more `kind` stays within the plan.
 * Returns null when allowed, otherwise a 403 payload the client can show with an upgrade link.
 */
export async function checkPlanLimit(userId: string, kind: LimitKind) {
  const sub = await getSubscription(userId);
  const limit = sub.plan.limits[kind];
  if (limit === null) return null;
  const used = (await getUsage(userId, sub))[kind];
  if (used < limit) return null;
  return {
    error: `Your ${sub.plan.name} plan allows ${formatLimit(limit)} ${LIMIT_NOUNS[kind]}. Upgrade your plan to add more.`,
    code: "PLAN_LIMIT_REACHED",
    kind,
    limit,
    used,
    plan: sub.planId,
  };
}
