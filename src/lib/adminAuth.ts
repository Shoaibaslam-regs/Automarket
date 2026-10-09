import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export type AdminAccess = "FULL" | "READ_ONLY";

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
 * "read" lets in every admin; "write" also requires FULL access.
 */
export async function requireAdminApi(mode: "read" | "write"): Promise<Gate> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  await connectDB();
  const user = await User.findById(session.user.id)
    .select("email role adminAccess")
    .lean<{ _id: mongoose.Types.ObjectId; email: string; role: string; adminAccess?: AdminAccess }>();
  if (!user || user.role !== "ADMIN") {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const adminAccess: AdminAccess = isPlatformOwner(user.email) ? "FULL" : user.adminAccess ?? "FULL";
  if (mode === "write" && adminAccess !== "FULL") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Your admin access is view-only. Ask a full admin to make this change." }, { status: 403 }),
    };
  }
  return { ok: true, admin: { _id: user._id, email: user.email, adminAccess } };
}
