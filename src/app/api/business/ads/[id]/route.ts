import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Ad } from "@/models/Ad";
import { getMembership, can } from "@/lib/business";
import { logBusinessAction } from "@/lib/businessLog";
import { reportError } from "@/lib/errorLog";

/** Cancels a request the team hasn't answered yet. Approved ads can only be stopped by an admin. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member || !can(member.role, "promote")) return NextResponse.json({ error: "Only the owner or a manager can cancel ads" }, { status: 403 });

    const ad = await Ad.findOneAndUpdate(
      { _id: id, organizationId: member.organizationId, status: "REQUESTED" },
      { $set: { status: "CANCELLED" } },
      { new: true }
    ).lean<{ _id: mongoose.Types.ObjectId; targetLabel: string }>();
    if (!ad) return NextResponse.json({ error: "Only requests still waiting for approval can be cancelled" }, { status: 400 });
    await logBusinessAction({ userId: session.user.id, organizationId: member.organizationId }, "ad.cancel", { type: "BUSINESS", id: ad._id, label: ad.targetLabel });
    return NextResponse.json({ ok: true });
  } catch (error) {
    reportError("Business ad DELETE error:", error);
    return NextResponse.json({ error: "Failed to cancel the request" }, { status: 500 });
  }
}
