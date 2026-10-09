import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Employee } from "@/models/Employee";
import { User } from "@/models/User";
import { auth } from "@/lib/auth";
import { can, getMembership } from "@/lib/business";

const ASSIGNABLE_ROLES = ["MANAGER", "SALES", "STAFF"];

/**
 * Loads a team member of the caller's own business that the caller may manage.
 * The owner can never be changed or removed here, and nobody can change their own record.
 */
async function loadManageable(sessionUserId: string, id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return { error: NextResponse.json({ error: "Team member not found" }, { status: 404 }) };
  await connectDB();
  const member = await getMembership(sessionUserId);
  if (!member) return { error: NextResponse.json({ error: "No organization" }, { status: 404 }) };
  if (!can(member.role, "manageTeam")) {
    return { error: NextResponse.json({ error: "Only the owner or a manager can manage the team" }, { status: 403 }) };
  }
  const employee = await Employee.findOne({ _id: id, organizationId: member.organizationId });
  if (!employee) return { error: NextResponse.json({ error: "Team member not found" }, { status: 404 }) };
  if (employee.role === "OWNER") return { error: NextResponse.json({ error: "The owner can't be changed or removed" }, { status: 403 }) };
  if (String(employee.userId) === sessionUserId) {
    return { error: NextResponse.json({ error: "You can't change your own role" }, { status: 400 }) };
  }
  return { employee };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { role } = await req.json().catch(() => ({}));
    if (!ASSIGNABLE_ROLES.includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    const found = await loadManageable(session.user.id, id);
    if (found.error) return found.error;
    found.employee.role = role;
    await found.employee.save();
    await User.findByIdAndUpdate(found.employee.userId, { organizationRole: role });
    return NextResponse.json({ employee: found.employee });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const found = await loadManageable(session.user.id, id);
    if (found.error) return found.error;
    await found.employee.deleteOne();
    await User.findByIdAndUpdate(found.employee.userId, { $unset: { organizationId: "", organizationRole: "" } });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
