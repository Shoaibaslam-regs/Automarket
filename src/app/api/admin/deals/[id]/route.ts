import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdminApi } from "@/lib/adminAuth";
import { Deal } from "@/models/Deal";
import { invalidateDeal } from "@/lib/pageCache";
import { logAdminAction } from "@/lib/adminLog";
import { reportError } from "@/lib/errorLog";

/** Disables or re-enables a deal (`{ disabledByAdmin }`), e.g. a misleading or abusive offer. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi("deals");
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    const { disabledByAdmin } = await req.json().catch(() => ({}));
    if (typeof disabledByAdmin !== "boolean") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const deal = await Deal.findByIdAndUpdate(id, { $set: { disabledByAdmin } }, { new: true });
    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    await invalidateDeal(deal._id, deal.organizationId);
    await logAdminAction(gate.admin, disabledByAdmin ? "deal.disable" : "deal.enable", { type: "DEAL", id: deal._id, label: deal.title });
    return NextResponse.json({ deal });
  } catch (error) {
    reportError("Admin deal PATCH error:", error);
    return NextResponse.json({ error: "Failed to update deal" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi("deals");
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    const deleted = await Deal.findByIdAndDelete(id);
    if (deleted) {
      await invalidateDeal(deleted._id, deleted.organizationId);
      await logAdminAction(gate.admin, "deal.delete", { type: "DEAL", id: deleted._id, label: deleted.title });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    reportError("Admin deal DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete deal" }, { status: 500 });
  }
}
