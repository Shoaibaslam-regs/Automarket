import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/adminLog";
import { reportError } from "@/lib/errorLog";
import { ErrorLog } from "@/models/ErrorLog";

const PAGE_SIZE = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Production errors grouped by kind, most recent first (see src/lib/errorLog.ts).
 * `?status=open|fixed|all` (default open), `?source=SERVER|CLIENT`, `?page=`.
 * `?count=1` returns only `{ open }`: open errors seen in the last 24 hours, for the sidebar badge.
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  try {
    const sp = req.nextUrl.searchParams;
    if (sp.get("count") === "1") {
      const open = await ErrorLog.countDocuments({ resolvedAt: { $exists: false }, lastSeenAt: { $gte: new Date(Date.now() - DAY_MS) } });
      return NextResponse.json({ open });
    }
    const filter: Record<string, unknown> = {};
    const status = sp.get("status") ?? "open";
    if (status === "open") filter.resolvedAt = { $exists: false };
    else if (status === "fixed") filter.resolvedAt = { $exists: true };
    const source = sp.get("source");
    if (source === "SERVER" || source === "CLIENT") filter.source = source;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const [errors, total, lastDay] = await Promise.all([
      ErrorLog.find(filter).sort({ lastSeenAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
      ErrorLog.countDocuments(filter),
      ErrorLog.aggregate<{ kinds: number; hits: number }>([
        { $match: { lastSeenAt: { $gte: new Date(Date.now() - DAY_MS) } } },
        { $group: { _id: null, kinds: { $sum: 1 }, hits: { $sum: "$count" } } },
      ]),
    ]);
    return NextResponse.json({
      errors,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      lastDay: { kinds: lastDay[0]?.kinds ?? 0, hits: lastDay[0]?.hits ?? 0 },
    });
  } catch (error) {
    reportError("Admin errors GET error:", error);
    return NextResponse.json({ error: "Failed to load errors" }, { status: 500 });
  }
}

/** Deletes every error marked fixed. Open ones stay. */
export async function DELETE() {
  const gate = await requireAdminApi("write");
  if (!gate.ok) return gate.response;
  try {
    const { deletedCount } = await ErrorLog.deleteMany({ resolvedAt: { $exists: true } });
    if (deletedCount) await logAdminAction(gate.admin, "errors.clear", { type: "SETTINGS", label: "Error log" }, `${deletedCount} fixed error${deletedCount === 1 ? "" : "s"} deleted`);
    return NextResponse.json({ deleted: deletedCount });
  } catch (error) {
    reportError("Admin errors DELETE error:", error);
    return NextResponse.json({ error: "Failed to clear errors" }, { status: 500 });
  }
}
