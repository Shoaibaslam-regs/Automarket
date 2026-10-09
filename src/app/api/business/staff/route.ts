import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Employee } from "@/models/Employee";
import { User } from "@/models/User";
import { auth } from "@/lib/auth";
import { checkPlanLimit } from "@/lib/subscription";
import { can, getMembership } from "@/lib/business";

/** Roles that can be given from the staff page; there is only ever one OWNER. */
const ASSIGNABLE_ROLES = ["MANAGER", "SALES", "STAFF"];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    const staff = await Employee.find({ organizationId: member.organizationId })
      .populate("userId", "name email phone image")
      .lean();
    return NextResponse.json({
      staff,
      permissions: { role: member.role, canManage: can(member.role, "manageTeam") },
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

    const targetUser = await User.findOne({ email: email.trim() });
    if (!targetUser) return NextResponse.json({ error: "No AutoMarket account found with this email" }, { status: 404 });
    if (targetUser.organizationId) {
      return NextResponse.json(
        { error: targetUser.organizationId.equals(member.organizationId) ? "This user is already a staff member" : "This user already belongs to another business" },
        { status: 400 }
      );
    }
    const overLimit = await checkPlanLimit(session.user.id, "staff");
    if (overLimit) return NextResponse.json(overLimit, { status: 403 });

    const employee = await Employee.create({ organizationId: member.organizationId, userId: targetUser._id, role });
    await User.findByIdAndUpdate(targetUser._id, { organizationId: member.organizationId, organizationRole: role });
    return NextResponse.json({ employee }, { status: 201 });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
