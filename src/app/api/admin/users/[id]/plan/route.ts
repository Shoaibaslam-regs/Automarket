import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { User } from "@/models/User";
import { requireAdminApi } from "@/lib/adminAuth";
import { isPlanId } from "@/lib/plans";

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
