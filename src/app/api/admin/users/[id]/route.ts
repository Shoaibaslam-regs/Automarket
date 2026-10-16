import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { User } from "@/models/User";
import { isPlatformOwner, requireAdminApi } from "@/lib/adminAuth";
import { checkAccountDeletion, deleteAccount } from "@/lib/accountDeletion";
import { logAdminAction } from "@/lib/adminLog";

const ROLES = ["USER", "SELLER", "ADMIN"] as const;
const ACCESS_LEVELS = ["FULL", "READ_ONLY"] as const;

/**
 * Changes a user's role. Making someone an admin always requires an explicit access level:
 * FULL can change things, READ_ONLY can only view the admin panel.
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

    const { role, adminAccess } = await req.json().catch(() => ({}));
    if (!ROLES.includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    if (role === "ADMIN" && !ACCESS_LEVELS.includes(adminAccess)) {
      return NextResponse.json({ error: "Choose full or view-only admin access" }, { status: 400 });
    }
    if (gate.admin._id.equals(id)) {
      return NextResponse.json({ error: "You can't change your own admin access" }, { status: 400 });
    }

    const target = await User.findById(id).select("email name role adminAccess");
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (isPlatformOwner(target.email)) {
      return NextResponse.json({ error: "The platform owner's access can't be changed" }, { status: 403 });
    }
    const before = target.role === "ADMIN" ? `ADMIN (${target.adminAccess ?? "FULL"})` : target.role;

    const user = await User.findByIdAndUpdate(
      id,
      role === "ADMIN" ? { $set: { role, adminAccess } } : { $set: { role }, $unset: { adminAccess: "" } },
      { new: true }
    ).select("name email role adminAccess");
    await logAdminAction(gate.admin, "user.role", { type: "USER", id, label: target.name || target.email },
      `${before} → ${role === "ADMIN" ? `ADMIN (${adminAccess})` : role}`);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAdminApi("write");
    if (!gate.ok) return gate.response;
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (gate.admin._id.equals(id)) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }
    const target = await User.findById(id).select("email name");
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (isPlatformOwner(target.email)) {
      return NextResponse.json({ error: "The platform owner can't be deleted" }, { status: 403 });
    }
    // Same cleanup as a user deleting their own account; business owners must have the business removed first
    const check = await checkAccountDeletion(id, { byAdmin: true });
    if (check.blockers.length) return NextResponse.json({ error: check.blockers[0] }, { status: 409 });
    await deleteAccount(id);
    await logAdminAction(gate.admin, "user.delete", { type: "USER", id, label: target.name || target.email }, target.email);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
