import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdminApi } from "@/lib/adminAuth";
import { Report } from "@/models/Report";
import { logAdminAction } from "@/lib/adminLog";
import { REPORT_REASON_LABEL } from "@/lib/reports";
import { reportError } from "@/lib/errorLog";

/**
 * Closes a report. Body: { action: "resolve" | "dismiss", note? }.
 * "resolve" means action was taken (e.g. the listing was removed); "dismiss" means nothing was wrong.
 * `alsoSimilar: true` closes every other open report about the same item with the same note.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi("reports");
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    const { action, note, alsoSimilar } = await req.json().catch(() => ({}));
    if (action !== "resolve" && action !== "dismiss") return NextResponse.json({ error: "Choose resolve or dismiss" }, { status: 400 });
    const resolution = typeof note === "string" ? note.trim().slice(0, 500) : "";
    if (action === "resolve" && resolution.length < 3) return NextResponse.json({ error: "Say what you did, e.g. \"Listing removed\"" }, { status: 400 });

    const report = await Report.findById(id);
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    if (report.status !== "OPEN") return NextResponse.json({ error: "This report is already closed" }, { status: 400 });

    const status = action === "resolve" ? "RESOLVED" : "DISMISSED";
    const set = { status, resolution: resolution || undefined, handledBy: gate.admin._id, handledAt: new Date() };
    const filter = alsoSimilar === true
      ? { targetType: report.targetType, targetId: report.targetId, status: "OPEN" }
      : { _id: report._id };
    const res = await Report.updateMany(filter, { $set: set });

    await logAdminAction(gate.admin, action === "resolve" ? "report.resolve" : "report.dismiss",
      { type: "REPORT", id: report._id, label: `${report.targetType.toLowerCase()} "${report.targetLabel}"` },
      `${REPORT_REASON_LABEL[report.reason] ?? report.reason}${resolution ? ` — ${resolution}` : ""}${res.modifiedCount > 1 ? ` (${res.modifiedCount} reports)` : ""}`);

    return NextResponse.json({ ok: true, closed: res.modifiedCount });
  } catch (error) {
    reportError("Admin report PATCH error:", error);
    return NextResponse.json({ error: "Failed to update the report" }, { status: 500 });
  }
}
