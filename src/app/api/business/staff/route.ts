import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Employee } from "@/models/Employee";
import { User } from "@/models/User";
import { auth } from "@/lib/auth";
import { checkPlanLimit } from "@/lib/subscription";
import { can, getMembership } from "@/lib/business";
import { logBusinessAction } from "@/lib/businessLog";
import { StaffInvite, STAFF_INVITE_DAYS } from "@/models/StaffInvite";
import { Organization } from "@/models/Organization";
import { sendChatMessage } from "@/lib/support";

/** Roles that can be given from the staff page; there is only ever one OWNER. */
const ASSIGNABLE_ROLES = ["MANAGER", "SALES", "STAFF"];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    const [staff, invites] = await Promise.all([
      Employee.find({ organizationId: member.organizationId }).populate("userId", "name email phone image").lean(),
      // Invitations not yet accepted (they expire on their own after STAFF_INVITE_DAYS)
      StaffInvite.find({ organizationId: member.organizationId }).populate("userId", "name email").sort({ createdAt: -1 }).lean(),
    ]);
    return NextResponse.json({
      staff,
      invites,
      permissions: {
        role: member.role,
        canManage: can(member.role, "manageTeam"),
        canViewActivity: can(member.role, "viewActivity"),
        canViewPerformance: can(member.role, "viewPerformance"),
      },
    });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!can(member.role, "manageTeam")) {
      return NextResponse.json({ error: "Only the owner or a manager can add team members" }, { status: 403 });
    }
    const { email, role = "STAFF" } = await req.json().catch(() => ({}));
    if (typeof email !== "string" || !email.trim()) return NextResponse.json({ error: "Email is required" }, { status: 400 });
    if (!ASSIGNABLE_ROLES.includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    if (role === "MANAGER" && member.role !== "OWNER") return NextResponse.json({ error: "Only the owner can add managers" }, { status: 403 });

    const targetUser = await User.findOne({ email: email.trim() });
    if (!targetUser) return NextResponse.json({ error: "No AutoGO account found with this email" }, { status: 404 });
    if (targetUser.organizationId) {
      return NextResponse.json(
        { error: targetUser.organizationId.equals(member.organizationId) ? "This user is already a staff member" : "This user already belongs to another business" },
        { status: 400 }
      );
    }
    const overLimit = await checkPlanLimit(session.user.id, "staff");
    if (overLimit) return NextResponse.json(overLimit, { status: 403 });

    if (String(targetUser._id) === session.user.id) return NextResponse.json({ error: "You're already on this team" }, { status: 400 });

    // An invitation, not a membership: the person joins only when they accept (POST /api/invites/[id]).
    // Adding them straight away put their own listings and rental bookings into this business without asking.
    const invite = await StaffInvite.findOneAndUpdate(
      { organizationId: member.organizationId, userId: targetUser._id },
      { $set: { role, invitedBy: session.user.id, createdAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const org = await Organization.findById(member.organizationId).select("name").lean<{ name: string }>();
    await sendChatMessage(session.user.id, String(targetUser._id),
      `You've been invited to join ${org?.name ?? "our business"} on AutoGO as ${role.toLowerCase()}. Accept or decline it on your dashboard (/dashboard). The invitation expires in ${STAFF_INVITE_DAYS} days.`,
      session.user.name);
    await logBusinessAction({ userId: session.user.id, organizationId: member.organizationId }, "staff.invite",
      { type: "STAFF", id: targetUser._id, label: targetUser.name || targetUser.email }, { details: role });
    return NextResponse.json({ invite }, { status: 201 });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
