import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { isPlatformOwner, requireAdminApi } from "@/lib/adminAuth";
import { User } from "@/models/User";
import { issuePersonalKey } from "@/lib/adminPersonalKey";
import { logAdminAction } from "@/lib/adminLog";
import { reportError } from "@/lib/errorLog";

/**
 * Makes a new personal admin key for an admin (full admins only) and returns it this once; the old key stops working.
 * Not for the platform owner, who uses the site key from the Overview, or for yourself.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi("admins");
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (gate.admin._id.equals(id)) return NextResponse.json({ error: "Ask another full admin for a new key" }, { status: 400 });
    const target = await User.findById(id).select("name email role").lean<{ name?: string; email: string; role: string }>();
    if (!target || target.role !== "ADMIN") return NextResponse.json({ error: "This person isn't an admin" }, { status: 404 });
    if (isPlatformOwner(target.email)) return NextResponse.json({ error: "The platform owner uses the site key from the Overview" }, { status: 400 });
    const adminKey = await issuePersonalKey(id);
    await logAdminAction(gate.admin, "user.adminKey", { type: "USER", id, label: target.name || target.email });
    return NextResponse.json({ adminKey });
  } catch (error) {
    reportError("Admin key reset error:", error);
    return NextResponse.json({ error: "Couldn't make a new key" }, { status: 500 });
  }
}
