import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { StaffInvite } from "@/models/StaffInvite";
import { reportError } from "@/lib/errorLog";
import "@/models/Organization";

export const dynamic = "force-dynamic";

/** The signed-in person's open invitations to join a business team (shown on their dashboard). */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ invites: [] });
    await connectDB();
    const invites = await StaffInvite.find({ userId: session.user.id })
      .populate("organizationId", "name logo city type isActive")
      .populate("invitedBy", "name")
      .sort({ createdAt: -1 })
      .lean<Array<{ organizationId?: { isActive?: boolean } | null }>>();
    // A suspended or deleted business's invitation can't be accepted, so it isn't shown
    return NextResponse.json({ invites: invites.filter(i => i.organizationId && i.organizationId.isActive !== false) });
  } catch (error) {
    reportError("Invites GET error:", error);
    return NextResponse.json({ invites: [] });
  }
}
