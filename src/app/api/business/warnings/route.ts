import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { can, getMembership } from "@/lib/business";
import { reportError } from "@/lib/errorLog";

/** The owner or a manager acknowledges every open admin warning, which hides the console banner. */
export async function PATCH() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!can(member.role, "manageTeam")) {
      return NextResponse.json({ error: "Only the owner or a manager can acknowledge warnings" }, { status: 403 });
    }
    // Only match when an open warning exists; businesses created before warnings have no array at all,
    // and an array-filter update on a missing path is a Mongo error
    await Organization.updateOne(
      { _id: member.organizationId, warnings: { $elemMatch: { acknowledgedAt: { $exists: false } } } },
      { $set: { "warnings.$[open].acknowledgedAt": new Date(), "warnings.$[open].acknowledgedBy": session.user.id } },
      { arrayFilters: [{ "open.acknowledgedAt": { $exists: false } }] }
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    reportError("Acknowledge warnings error:", error);
    return NextResponse.json({ error: "Failed to acknowledge" }, { status: 500 });
  }
}
