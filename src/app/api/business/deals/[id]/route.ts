import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Deal } from "@/models/Deal";
import { can, getMembership } from "@/lib/business";
import { parseDealInput } from "@/lib/dealInput";
import { invalidateBusinessPage } from "@/lib/pageCache";

async function gate(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!mongoose.Types.ObjectId.isValid(id)) return { error: NextResponse.json({ error: "Deal not found" }, { status: 404 }) };
  await connectDB();
  const member = await getMembership(session.user.id);
  if (!member) return { error: NextResponse.json({ error: "No organization" }, { status: 404 }) };
  if (!can(member.role, "manageDeals")) return { error: NextResponse.json({ error: "Only the owner or a manager can manage deals" }, { status: 403 }) };
  const deal = await Deal.findOne({ _id: id, organizationId: member.organizationId });
  if (!deal) return { error: NextResponse.json({ error: "Deal not found" }, { status: 404 }) };
  return { deal, userId: session.user.id };
}

/** Edits a deal, or just pauses/resumes it with `{ paused }`. Admin-disabled deals stay disabled. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const g = await gate(id);
    if (g.error) return g.error;
    const body = await req.json().catch(() => ({}));

    if (Object.keys(body).length === 1 && typeof body.paused === "boolean") {
      g.deal.paused = body.paused;
    } else {
      const parsed = await parseDealInput(body, g.userId);
      if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
      g.deal.set(parsed.data);
      if (typeof body.paused === "boolean") g.deal.paused = body.paused;
    }
    await g.deal.save();
    await invalidateBusinessPage(g.deal.organizationId);
    return NextResponse.json({ deal: g.deal });
  } catch (error) {
    console.error("Deal PATCH error:", error);
    return NextResponse.json({ error: "Failed to update deal" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const g = await gate(id);
    if (g.error) return g.error;
    await g.deal.deleteOne();
    await invalidateBusinessPage(g.deal.organizationId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Deal DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete deal" }, { status: 500 });
  }
}
