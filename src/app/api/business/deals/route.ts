import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Deal } from "@/models/Deal";
import { can, getMembership, getOrgUserIds } from "@/lib/business";
import { parseDealInput } from "@/lib/dealInput";
import { invalidateDeal } from "@/lib/pageCache";
import { reserveListingSlot } from "@/lib/subscription";
import { logBusinessAction } from "@/lib/businessLog";
import { reportError } from "@/lib/errorLog";

export const dynamic = "force-dynamic";

/** The business's deals, newest first. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    const deals = await Deal.find({ organizationId: member.organizationId }).sort({ createdAt: -1 }).populate("createdBy", "name").lean();
    return NextResponse.json({ deals, permissions: { canManage: can(member.role, "manageDeals") } });
  } catch (error) {
    reportError("Deals GET error:", error);
    return NextResponse.json({ error: "Failed to load deals" }, { status: 500 });
  }
}

/** Publishes a new stand-alone deal with its own photos and vehicle details. */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!can(member.role, "manageDeals")) return NextResponse.json({ error: "Only the owner or a manager can create deals" }, { status: 403 });

    const parsed = await parseDealInput(await req.json().catch(() => null), { memberIds: await getOrgUserIds(member.organizationId) });
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    // Deals share the plan's monthly listing quota; the slot is taken before the deal is saved (see reserveListingSlot)
    // and counts for good, even if the deal is deleted later
    const dealId = new mongoose.Types.ObjectId();
    const slot = await reserveListingSlot(session.user.id, { dealId });
    if (!slot.ok) return NextResponse.json(slot.error, { status: 403 });
    let deal;
    try {
      deal = await Deal.create({ ...parsed.data, _id: dealId, organizationId: member.organizationId, createdBy: session.user.id });
    } catch (e) {
      await slot.release();
      throw e;
    }
    await invalidateDeal(deal._id, member.organizationId);
    await logBusinessAction({ userId: session.user.id, organizationId: member.organizationId }, "deal.create",
      { type: "DEAL", id: deal._id, label: deal.title });
    return NextResponse.json({ deal }, { status: 201 });
  } catch (error) {
    reportError("Deals POST error:", error);
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
  }
}
