// Server-only. Keeps the Verified badge that comes with a plan (src/lib/planBadge.ts) in step with the owner's plan:
// called after an admin activates, renews, gifts, trials or revokes a plan, and when a business is created.
import mongoose from "mongoose";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { effectivePlanId, planHas } from "@/lib/plans";
import { planBadgeUpdate, type PlanBadgeState } from "@/lib/planBadge";
import { invalidateBusinessSlug } from "@/lib/pageCache";
import { reportError } from "@/lib/errorLog";

type Oid = mongoose.Types.ObjectId;

/** Applies the plan's badge to the business this user owns. Returns whether the badge changed. Never throws. */
export async function syncPlanBadge(ownerId: string | Oid): Promise<boolean> {
  try {
    const owner = await User.findById(ownerId).select("plan planExpiresAt").lean<{ plan?: string; planExpiresAt?: Date }>();
    if (!owner) return false;
    const org = await Organization.findOne({ ownerId }).select("slug verification").lean<{ _id: Oid; slug: string; verification?: PlanBadgeState }>();
    if (!org) return false;
    const plan = effectivePlanId(owner.plan, owner.planExpiresAt);
    const planEnd = planHas(plan, "verifiedIncluded") && owner.planExpiresAt ? new Date(owner.planExpiresAt) : null;
    const update = planBadgeUpdate(org.verification, planEnd);
    if (!update) return false;
    const set: Record<string, unknown> = { "verification.expiresAt": update.expiresAt, "verification.source": update.source };
    if (update.verifiedAt) set["verification.verifiedAt"] = update.verifiedAt;
    const unset: Record<string, 1> = {};
    if (update.paidUntil) set["verification.paidUntil"] = update.paidUntil; else unset["verification.paidUntil"] = 1;
    if (update.paidSource) set["verification.paidSource"] = update.paidSource; else unset["verification.paidSource"] = 1;
    await Organization.updateOne({ _id: org._id }, { $set: set, $unset: unset });
    invalidateBusinessSlug(org.slug);
    return true;
  } catch (error) {
    reportError("Plan badge sync failed:", error);
    return false;
  }
}
