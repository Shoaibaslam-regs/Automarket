import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { LedgerEntry } from "@/models/LedgerEntry";
import { moneyGate } from "@/lib/moneyAccess";
import { logBusinessAction } from "@/lib/businessLog";
import { MONEY_LABEL } from "@/lib/money";
import { reportError } from "@/lib/errorLog";

/** Deletes an entry added by hand. Automatic entries follow real payments, so change the payment instead. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await moneyGate();
    if ("error" in g) return g.error;
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    const entry = await LedgerEntry.findOne({ _id: id, organizationId: g.member.organizationId });
    if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    if (entry.source === "AUTO") return NextResponse.json({ error: "This entry comes from a recorded payment. Change the payment on the booking or sale instead." }, { status: 400 });
    await entry.deleteOne();
    await logBusinessAction({ userId: g.userId, organizationId: g.member.organizationId }, "money.delete",
      { type: "MONEY", id: entry._id, label: MONEY_LABEL[entry.category] }, { details: `PKR ${entry.amount.toLocaleString()} ${entry.type === "IN" ? "in" : "out"}` });
    return NextResponse.json({ ok: true });
  } catch (error) {
    reportError("Money entry DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
