import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { User } from "@/models/User";
import { requireAdminApi } from "@/lib/adminAuth";
import { effectivePlanId, isPlanId } from "@/lib/plans";

const DURATIONS = [1, 3, 6, 12];

/**
 * Gives a user a plan for free, or moves them back to Free.
 * Body: { plan: PlanId, months: 1 | 3 | 6 | 12 | null }. `months: null` means no end date.
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

    const { plan, months } = await req.json().catch(() => ({}));
    if (!isPlanId(plan)) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    if (plan !== "FREE" && months !== null && !DURATIONS.includes(months)) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }

    let update;
    if (plan === "FREE") {
      update = { $set: { plan }, $unset: { planExpiresAt: "", planSource: "", planGrantedBy: "" } };
    } else {
      const expiresAt = months === null ? null : new Date(Date.now());
      if (expiresAt) expiresAt.setMonth(expiresAt.getMonth() + months);
      update = {
        $set: { plan, planSource: "ADMIN_GRANT", planGrantedBy: gate.admin._id, ...(expiresAt && { planExpiresAt: expiresAt }) },
        ...(expiresAt ? {} : { $unset: { planExpiresAt: "" } }),
      };
    }

    const user = await User.findByIdAndUpdate(id, update, { new: true }).select("name email plan planExpiresAt planSource");
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  }
}

/**
 * Takes back a plan an admin gifted, returning the user (and any business they own) to Free.
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
    if (user.planSource !== "ADMIN_GRANT") {
      return NextResponse.json({ error: "Only gifted plans can be revoked. This plan was paid for." }, { status: 400 });
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: { plan: "FREE" }, $unset: { planExpiresAt: "", planSource: "", planGrantedBy: "" } },
      { new: true }
    ).select("name email plan");
    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ error: "Failed to revoke plan" }, { status: 500 });
  }
}
