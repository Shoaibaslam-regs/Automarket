import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { can, getMembership } from "@/lib/business";
import { StaffInvite } from "@/models/StaffInvite";
import { logBusinessAction } from "@/lib/businessLog";
import { reportError } from "@/lib/errorLog";

/** Cancels an invitation this business sent that hasn't been accepted yet (owner or manager). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member || !can(member.role, "manageTeam")) return NextResponse.json({ error: "Only the owner or a manager can manage the team" }, { status: 403 });
    const invite = await StaffInvite.findOneAndDelete({ _id: id, organizationId: member.organizationId }).populate("userId", "name email")
      .lean<{ userId?: { _id: mongoose.Types.ObjectId; name?: string; email: string }; role: string }>();
    if (!invite) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    await logBusinessAction({ userId: session.user.id, organizationId: member.organizationId }, "staff.inviteCancel",
      { type: "STAFF", id: invite.userId?._id, label: invite.userId?.name || invite.userId?.email }, { details: invite.role });
    return NextResponse.json({ ok: true });
  } catch (error) {
    reportError("Cancel staff invite error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
