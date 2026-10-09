import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { User } from "@/models/User";
import { isPlatformOwner, requireAdminApi } from "@/lib/adminAuth";

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

    const target = await User.findById(id).select("email");
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (isPlatformOwner(target.email)) {
      return NextResponse.json({ error: "The platform owner's access can't be changed" }, { status: 403 });
    }

    const user = await User.findByIdAndUpdate(
      id,
      role === "ADMIN" ? { $set: { role, adminAccess } } : { $set: { role }, $unset: { adminAccess: "" } },
      { new: true }
    ).select("name email role adminAccess");
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
    const target = await User.findById(id).select("email");
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (isPlatformOwner(target.email)) {
      return NextResponse.json({ error: "The platform owner can't be deleted" }, { status: 403 });
    }
    await User.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
