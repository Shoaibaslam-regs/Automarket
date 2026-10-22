import { NextRequest, NextResponse } from "next/server";
import { isPlatformOwner, requireAdminApi } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/adminLog";
import { AdminLog } from "@/models/AdminLog";

const PAGE_SIZE = 50;

/**
 * The admin action log, newest first. `?type=USER|BUSINESS|LISTING|DEAL|REPORT`, `?q=` (admin email,
 * target name or details), `?page=` (50 per page).
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  try {
    const sp = req.nextUrl.searchParams;
    const filter: Record<string, unknown> = {};
    const type = sp.get("type");
    if (type && ["USER", "BUSINESS", "LISTING", "DEAL", "REPORT", "ANNOUNCEMENT", "AD", "SETTINGS"].includes(type)) filter.targetType = type;
    const q = sp.get("q")?.trim();
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 80), "i");
      filter.$or = [{ adminEmail: rx }, { adminName: rx }, { targetLabel: rx }, { details: rx }];
    }
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const [entries, total] = await Promise.all([
      AdminLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
      AdminLog.countDocuments(filter),
    ]);
    return NextResponse.json({ entries, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), canClear: isPlatformOwner(gate.admin.email) });
  } catch (error) {
    console.error("Admin activity GET error:", error);
    return NextResponse.json({ error: "Failed to load the activity log" }, { status: 500 });
  }
}

/**
 * Deletes admin activity history. Only the platform owner (ADMIN_EMAIL) may do this, since the log is the
 * record of what every admin did. `?olderThan=30|90` keeps recent days; without it everything goes.
 * An "activity.clear" entry is written afterwards so the deletion itself stays on record.
 */
export async function DELETE(req: NextRequest) {
  const gate = await requireAdminApi("write");
  if (!gate.ok) return gate.response;
  if (!isPlatformOwner(gate.admin.email)) return NextResponse.json({ error: "Only the platform owner can delete activity history" }, { status: 403 });
  try {
    const olderThan = req.nextUrl.searchParams.get("olderThan");
    const days = olderThan === "30" ? 30 : olderThan === "90" ? 90 : null;
    if (olderThan && !days) return NextResponse.json({ error: "Choose 30 or 90 days, or everything" }, { status: 400 });
    const { deletedCount } = await AdminLog.deleteMany(days ? { createdAt: { $lt: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } } : {});
    if (deletedCount) {
      await logAdminAction(gate.admin, "activity.clear", { type: "USER", id: gate.admin._id, label: days ? `Older than ${days} days` : "All history" },
        `${deletedCount} entr${deletedCount === 1 ? "y" : "ies"} deleted`);
    }
    return NextResponse.json({ deleted: deletedCount });
  } catch (error) {
    console.error("Admin activity DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete activity history" }, { status: 500 });
  }
}
