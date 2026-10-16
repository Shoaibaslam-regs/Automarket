import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminAuth";
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
    if (type && ["USER", "BUSINESS", "LISTING", "DEAL", "REPORT"].includes(type)) filter.targetType = type;
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
    return NextResponse.json({ entries, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
  } catch (error) {
    console.error("Admin activity GET error:", error);
    return NextResponse.json({ error: "Failed to load the activity log" }, { status: 500 });
  }
}
