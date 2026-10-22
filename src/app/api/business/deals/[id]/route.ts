import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Deal } from "@/models/Deal";
import { can, getMembership, getOrgUserIds } from "@/lib/business";
import { parseDealInput } from "@/lib/dealInput";
import { invalidateDeal } from "@/lib/pageCache";
import { logBusinessAction } from "@/lib/businessLog";
import { reportError } from "@/lib/errorLog";

/** Finds a deal of the caller's business. `manage` also requires the manageDeals permission. */
async function gate(id: string, manage: boolean) {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!mongoose.Types.ObjectId.isValid(id)) return { error: NextResponse.json({ error: "Deal not found" }, { status: 404 }) };
  await connectDB();
  const member = await getMembership(session.user.id);
  if (!member) return { error: NextResponse.json({ error: "No organization" }, { status: 404 }) };
  if (manage && !can(member.role, "manageDeals")) return { error: NextResponse.json({ error: "Only the owner or a manager can manage deals" }, { status: 403 }) };
  const deal = await Deal.findOne({ _id: id, organizationId: member.organizationId });
  if (!deal) return { error: NextResponse.json({ error: "Deal not found" }, { status: 404 }) };
  return { deal, member, userId: session.user.id };
}

/** One deal, for the edit form. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await gate((await params).id, false);
    if (g.error) return g.error;
    return NextResponse.json({ deal: g.deal, permissions: { canManage: can(g.member.role, "manageDeals") } });
  } catch (error) {
    reportError("Deal GET error:", error);
    return NextResponse.json({ error: "Failed to load deal" }, { status: 500 });
  }
}

/** Edits a deal, or just pauses/resumes it with `{ paused }`. Admin-disabled deals stay disabled. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await gate((await params).id, true);
    if (g.error) return g.error;
    const body = await req.json().catch(() => ({}));

    if (Object.keys(body).length === 1 && typeof body.paused === "boolean") {
      g.deal.paused = body.paused;
    } else {
      const parsed = await parseDealInput(body, {
        memberIds: await getOrgUserIds(g.member.organizationId),
        existingImages: g.deal.images,
      });
      if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
      g.deal.set(parsed.data);
      // Fields left empty in the form are cleared rather than kept
      for (const key of ["description", "mileage", "fuelType", "transmission", "color", "deposit"] as const) {
        if (parsed.data[key] === undefined) g.deal.set(key, undefined);
      }
      if (typeof body.paused === "boolean") g.deal.paused = body.paused;
    }
    await g.deal.save();
    await invalidateDeal(g.deal._id, g.deal.organizationId);
    const pauseOnly = Object.keys(body).length === 1 && typeof body.paused === "boolean";
    await logBusinessAction({ userId: g.userId, organizationId: g.member.organizationId }, "deal.update",
      { type: "DEAL", id: g.deal._id, label: g.deal.title }, { details: pauseOnly ? (body.paused ? "Paused" : "Resumed") : "Edited details" });
    return NextResponse.json({ deal: g.deal });
  } catch (error) {
    reportError("Deal PATCH error:", error);
    return NextResponse.json({ error: "Failed to update deal" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await gate((await params).id, true);
    if (g.error) return g.error;
    await g.deal.deleteOne();
    await invalidateDeal(g.deal._id, g.deal.organizationId);
    await logBusinessAction({ userId: g.userId, organizationId: g.member.organizationId }, "deal.delete", { type: "DEAL", id: g.deal._id, label: g.deal.title });
    return NextResponse.json({ ok: true });
  } catch (error) {
    reportError("Deal DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete deal" }, { status: 500 });
  }
}
