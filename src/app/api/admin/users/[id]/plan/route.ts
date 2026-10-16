import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { User } from "@/models/User";
import { requireAdminApi } from "@/lib/adminAuth";
import { TrialClaim } from "@/models/TrialClaim";
import { PLANS, TRIAL_MONTHS, addPlanPeriods, effectivePlanId, isFreeGrant, isPlanId } from "@/lib/plans";
import { logAdminAction } from "@/lib/adminLog";

/** Gift lengths, in 30-day plan periods */
const DURATIONS = [1, 3, 6, 12];

/**
 * Activates a plan for a user, or moves them back to Free.
 * Body: { plan: PlanId, source: "PAID" | "ADMIN_GRANT", months }.
 * - PAID: the customer paid for one 30-day period. If the same plan is still running (paid, gifted or a trial)
 *   the 30 days are added to the time left. When it ends the account falls back to Free until they buy again.
 * - ADMIN_GRANT (a gift): `months` is 1, 3, 6 or 12 periods of 30 days. Every plan has an end date.
 * With `trial: true` it starts the account's one-time free trial instead (TRIAL_MONTHS long);
 * a second trial is refused for good, even after the first is revoked.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAdminApi("write");
    if (!gate.ok) return gate.response;
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { plan, months, trial, source = "ADMIN_GRANT" } = await req.json().catch(() => ({}));
    if (source !== "PAID" && source !== "ADMIN_GRANT") return NextResponse.json({ error: "Say whether it was paid or a gift" }, { status: 400 });
    if (!isPlanId(plan)) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    if (trial === true) {
      if (plan === "FREE") return NextResponse.json({ error: "Choose a paid plan for the trial" }, { status: 400 });
      // One trial per phone number too: new accounts can't farm trials with the same verified phone
      const target = await User.findById(id).select("email verifiedPhone trialUsedAt").lean<{ email: string; verifiedPhone?: string; trialUsedAt?: Date }>();
      if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
      if (!target.trialUsedAt) {
        if (!target.verifiedPhone) {
          return NextResponse.json({ error: "This user hasn't verified their phone yet. Ask them to verify it in Profile & settings, then start the trial.", code: "PHONE_NOT_VERIFIED" }, { status: 409 });
        }
        // Claim the number first; the unique index makes this hold even if two admins act at once,
        // and the claim outlives the account, so a deleted-and-recreated account can't trial again
        try {
          await TrialClaim.create({ phone: target.verifiedPhone, userId: id, email: target.email });
        } catch (e) {
          if ((e as { code?: number }).code !== 11000) throw e;
          const prior = await TrialClaim.findOne({ phone: target.verifiedPhone }).select("email claimedAt").lean<{ email: string; claimedAt: Date }>();
          return NextResponse.json(
            { error: `This phone number already had a free trial${prior ? ` (${prior.email}, ${new Date(prior.claimedAt).toLocaleDateString("en-PK")})` : ""}. You can still gift a plan.`, code: "TRIAL_USED" },
            { status: 409 }
          );
        }
      }
      const now = new Date();
      const expiresAt = addPlanPeriods(now, TRIAL_MONTHS);
      // The trialUsedAt condition makes "only once" hold even if two admins click at the same time
      const user = await User.findOneAndUpdate(
        { _id: id, trialUsedAt: { $exists: false } },
        { $set: { plan, planSource: "TRIAL", planExpiresAt: expiresAt, planGrantedBy: gate.admin._id, trialUsedAt: now, trialPlan: plan, trialPhone: target.verifiedPhone } },
        { new: true }
      ).select("name email plan planExpiresAt planSource trialUsedAt trialPlan");
      if (user) {
        await logAdminAction(gate.admin, "user.plan", { type: "USER", id, label: user.name || user.email }, `Started ${PLANS[plan].name} free trial until ${expiresAt.toLocaleDateString("en-PK")}`);
        return NextResponse.json({ user });
      }
      const existing = await User.findById(id).select("trialUsedAt trialPlan").lean<{ trialUsedAt?: Date; trialPlan?: string }>();
      if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });
      const when = existing.trialUsedAt ? new Date(existing.trialUsedAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "";
      return NextResponse.json(
        { error: `This account already used its free trial${existing.trialPlan && isPlanId(existing.trialPlan) ? ` (${PLANS[existing.trialPlan].name})` : ""}${when ? ` on ${when}` : ""}. You can still gift a plan.`, code: "TRIAL_USED" },
        { status: 409 }
      );
    }

    if (plan !== "FREE" && source === "ADMIN_GRANT" && !DURATIONS.includes(months)) {
      return NextResponse.json({ error: "Choose how long the gift lasts" }, { status: 400 });
    }

    let update;
    if (plan === "FREE") {
      update = { $set: { plan }, $unset: { planExpiresAt: "", planSource: "", planGrantedBy: "" } };
    } else {
      const now = new Date();
      let expiresAt: Date;
      if (source === "PAID") {
        // Paying for the plan they already have (paid, gifted or trial) adds the 30 days after the time left
        const current = await User.findById(id).select("plan planExpiresAt").lean<{ plan?: string; planExpiresAt?: Date }>();
        const stillRunning = current?.plan === plan && current.planExpiresAt && current.planExpiresAt > now;
        expiresAt = addPlanPeriods(stillRunning ? current!.planExpiresAt! : now, 1);
      } else {
        expiresAt = addPlanPeriods(now, months);
      }
      update = { $set: { plan, planSource: source, planGrantedBy: gate.admin._id, planExpiresAt: expiresAt } };
    }

    const user = await User.findByIdAndUpdate(id, update, { new: true }).select("name email plan planExpiresAt planSource");
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const until = user.planExpiresAt ? ` until ${new Date(user.planExpiresAt).toLocaleDateString("en-PK")}` : "";
    await logAdminAction(gate.admin, "user.plan", { type: "USER", id, label: user.name || user.email },
      plan === "FREE" ? "Set to Free" : `${source === "PAID" ? "Activated paid" : `Gifted (${months} × 30 days)`} ${PLANS[plan].name}${until}`);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  }
}

/**
 * Takes back a gifted plan or free trial, returning the user (and any business they own) to Free.
 * Revoking a trial does not give the account a new one.
 * Paid plans can't be revoked here, so this can never undo a real purchase.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAdminApi("write");
    if (!gate.ok) return gate.response;
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const user = await User.findById(id).select("plan planSource planExpiresAt");
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (effectivePlanId(user.plan, user.planExpiresAt) === "FREE") {
      return NextResponse.json({ error: "This account is already on the Free plan" }, { status: 400 });
    }
    if (!isFreeGrant(user.planSource)) {
      return NextResponse.json({ error: "Only gifted plans and free trials can be revoked. This plan was paid for." }, { status: 400 });
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: { plan: "FREE" }, $unset: { planExpiresAt: "", planSource: "", planGrantedBy: "" } },
      { new: true }
    ).select("name email plan");
    await logAdminAction(gate.admin, "user.planRevoke", { type: "USER", id, label: updated?.name || updated?.email }, `Revoked ${user.planSource === "TRIAL" ? "free trial" : "gifted plan"}`);
    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ error: "Failed to revoke plan" }, { status: 500 });
  }
}
