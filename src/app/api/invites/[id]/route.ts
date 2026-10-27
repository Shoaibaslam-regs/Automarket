import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { StaffInvite } from "@/models/StaffInvite";
import { Employee } from "@/models/Employee";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { checkPlanLimit } from "@/lib/subscription";
import { logBusinessAction } from "@/lib/businessLog";
import { triggerPusher } from "@/lib/support";
import { reportError } from "@/lib/errorLog";

/**
 * Accepts or declines an invitation to join a business team: `{ action: "accept" | "decline" }`.
 * Only the invited person can answer it. Accepting checks again that they have no business, that the business
 * is active and that its plan still has room, then makes them a member with the role they were invited for.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    const { action } = await req.json().catch(() => ({}));
    if (action !== "accept" && action !== "decline") return NextResponse.json({ error: "Choose accept or decline" }, { status: 400 });
    await connectDB();

    const invite = await StaffInvite.findOne({ _id: id, userId: session.user.id });
    if (!invite) return NextResponse.json({ error: "This invitation has expired or was cancelled" }, { status: 404 });

    if (action === "decline") {
      await invite.deleteOne();
      return NextResponse.json({ ok: true });
    }

    const [user, org] = await Promise.all([
      User.findById(session.user.id).select("organizationId name email"),
      Organization.findOne({ _id: invite.organizationId, isActive: { $ne: false } }).select("name ownerId").lean<{ _id: mongoose.Types.ObjectId; name: string; ownerId: mongoose.Types.ObjectId }>(),
    ]);
    if (!org) {
      await invite.deleteOne();
      return NextResponse.json({ error: "This business isn't accepting new members right now" }, { status: 400 });
    }
    if (user?.organizationId) return NextResponse.json({ error: "You already belong to a business. Leave it first to join another." }, { status: 400 });
    // The team limit is the owner's plan
    const overLimit = await checkPlanLimit(String(org.ownerId), "staff");
    if (overLimit) return NextResponse.json({ error: `${org.name}'s team is full on its plan. Ask them to upgrade, then accept again.` }, { status: 403 });

    await Employee.create({ organizationId: org._id, userId: session.user.id, role: invite.role });
    await User.updateOne({ _id: session.user.id }, { organizationId: org._id, organizationRole: invite.role });
    await StaffInvite.deleteMany({ userId: session.user.id });
    await logBusinessAction({ userId: session.user.id, organizationId: org._id }, "staff.join",
      { type: "STAFF", id: session.user.id, label: user?.name || user?.email }, { details: invite.role });
    await triggerPusher(`user-${invite.invitedBy}`, "new-notification", { type: "message", from: user?.name, preview: `joined ${org.name}` });
    return NextResponse.json({ ok: true, organization: { name: org.name } });
  } catch (error) {
    reportError("Answer staff invite error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
