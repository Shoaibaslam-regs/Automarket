import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { User } from "@/models/User";
import { isPlatformOwner, requireAdminApi } from "@/lib/adminAuth";
import { normalizeAdminAccess } from "@/lib/adminRoles";
import { issuePersonalKey } from "@/lib/adminPersonalKey";
import { checkAccountDeletion, deleteAccount } from "@/lib/accountDeletion";
import { logAdminAction } from "@/lib/adminLog";
import { newSessionKey } from "@/lib/accountTokens";

const ROLES = ["USER", "SELLER", "ADMIN"] as const;
const ACCESS_LEVELS = ["FULL", "MANAGER"] as const;

/**
 * Changes a user's role. Making someone an admin always requires an explicit access level:
 * FULL or MANAGER (src/lib/adminRoles.ts). Only full admins can do this; nobody can change the platform owner.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAdminApi("admins");
    if (!gate.ok) return gate.response;
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { role, adminAccess } = await req.json().catch(() => ({}));
    if (!ROLES.includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    if (role === "ADMIN" && !ACCESS_LEVELS.includes(adminAccess)) {
      return NextResponse.json({ error: "Choose full admin or manager" }, { status: 400 });
    }
    if (gate.admin._id.equals(id)) {
      return NextResponse.json({ error: "You can't change your own admin access" }, { status: 400 });
    }

    const target = await User.findById(id).select("email name role adminAccess isSupportAccount");
    if (!target || target.isSupportAccount) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (isPlatformOwner(target.email)) {
      return NextResponse.json({ error: "The platform owner's access can't be changed" }, { status: 403 });
    }
    const before = target.role === "ADMIN" ? `ADMIN (${normalizeAdminAccess(target.adminAccess)})` : target.role;

    const user = await User.findByIdAndUpdate(
      id,
      // A new session key signs the person out within minutes, so a removed admin loses the panel straight away
      // Removing admin also deletes their personal admin key and any sign-in code
      role === "ADMIN"
        ? { $set: { role, adminAccess, sessionKey: newSessionKey() } }
        : { $set: { role, sessionKey: newSessionKey() }, $unset: { adminAccess: "", adminKeyHash: "", adminKeyCreatedAt: "", adminCodeHash: "", adminCodeExpires: "", adminCodeTries: "" } },
      { new: true }
    ).select("name email role adminAccess");
    await logAdminAction(gate.admin, "user.role", { type: "USER", id, label: target.name || target.email },
      `${before} → ${role === "ADMIN" ? `ADMIN (${adminAccess})` : role}`);
    // A new admin gets their personal key for the hidden admin entry, shown this once to pass on
    const adminKey = role === "ADMIN" && target.role !== "ADMIN" ? await issuePersonalKey(id) : undefined;
    return NextResponse.json({ user, ...(adminKey ? { adminKey } : {}) });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAdminApi("users");
    if (!gate.ok) return gate.response;
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (gate.admin._id.equals(id)) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }
    const target = await User.findById(id).select("email name isSupportAccount");
    if (!target || target.isSupportAccount) return NextResponse.json({ error: "User not found" }, { status: 404 });
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
