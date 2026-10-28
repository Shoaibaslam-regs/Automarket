import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

import { adminCan, normalizeAdminAccess, type AdminAccess, type AdminPermission } from "@/lib/adminRoles";

export type { AdminAccess, AdminPermission };

type AdminUser = { _id: mongoose.Types.ObjectId; email: string; adminAccess: AdminAccess };

type Gate =
  | { ok: true; admin: AdminUser }
  | { ok: false; response: NextResponse };

/** The platform owner (ADMIN_EMAIL) can never be demoted, limited or deleted from the admin panel. */
export function isPlatformOwner(email?: string | null): boolean {
  const owner = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return !!owner && !!email && email.trim().toLowerCase() === owner;
}

/**
 * Guards admin API routes. The role is re-read from the database rather than the JWT,
 * so a demoted or limited admin loses access immediately.
 * "read" lets in every admin; a permission (src/lib/adminRoles.ts) also requires an access level that has it, so
 * managers can't make admins, delete users, take down listings or change the settings.
 * The session must also come from the hidden admin form on /login (session.user.adminPortal, see src/lib/adminGate.ts):
 * an admin signed in through the normal form is treated like any other user here.
 */
export async function requireAdminApi(need: "read" | AdminPermission): Promise<Gate> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  await connectDB();
  const user = await User.findById(session.user.id)
    .select("email role adminAccess")
    .lean<{ _id: mongoose.Types.ObjectId; email: string; role: string; adminAccess?: string }>();
  if (!user || user.role !== "ADMIN" || !session.user.adminPortal) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const adminAccess: AdminAccess = isPlatformOwner(user.email) ? "FULL" : normalizeAdminAccess(user.adminAccess);
  if (need !== "read" && !adminCan(adminAccess, need)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Your admin role can't do this. Ask a full admin to make this change." }, { status: 403 }),
    };
  }
  return { ok: true, admin: { _id: user._id, email: user.email, adminAccess } };
}
