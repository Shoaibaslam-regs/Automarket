import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { BusinessLog } from "@/models/BusinessLog";
import { can, getMembership } from "@/lib/business";
import { BUSINESS_LOG_TYPES } from "@/lib/businessActions";
import { logBusinessAction } from "@/lib/businessLog";

const PAGE_SIZE = 50;

/** The team's activity, newest first (owner only). `?member=<userId>`, `?type=BOOKING|SALE|…`, `?page=`. */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!can(member.role, "viewActivity")) return NextResponse.json({ error: "Only the business owner can see team activity" }, { status: 403 });

    const sp = req.nextUrl.searchParams;
    const filter: Record<string, unknown> = { organizationId: member.organizationId };
    const who = sp.get("member");
    if (who && mongoose.Types.ObjectId.isValid(who)) filter.userId = new mongoose.Types.ObjectId(who);
    const type = sp.get("type");
    if (type && (BUSINESS_LOG_TYPES as readonly string[]).includes(type)) filter.targetType = type;
    const page = Math.max(1, Number(sp.get("page")) || 1);

    const [entries, total] = await Promise.all([
      BusinessLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
      BusinessLog.countDocuments(filter),
    ]);
    return NextResponse.json({ entries, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
  } catch (error) {
    console.error("Business activity GET error:", error);
    return NextResponse.json({ error: "Failed to load activity" }, { status: 500 });
  }
}

/**
 * Deletes activity history (owner only). `?olderThan=30|90` keeps the recent days; without it everything goes.
 * A "Deleted activity history" entry is written afterwards so the log shows it was cleared.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!can(member.role, "viewActivity")) return NextResponse.json({ error: "Only the business owner can delete activity history" }, { status: 403 });

    const olderThan = req.nextUrl.searchParams.get("olderThan");
    const days = olderThan === "30" ? 30 : olderThan === "90" ? 90 : null;
    if (olderThan && !days) return NextResponse.json({ error: "Choose 30 or 90 days, or everything" }, { status: 400 });
    const filter: Record<string, unknown> = { organizationId: member.organizationId };
    if (days) filter.createdAt = { $lt: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };

    const { deletedCount } = await BusinessLog.deleteMany(filter);
    if (deletedCount) {
      await logBusinessAction({ userId: session.user.id, organizationId: member.organizationId }, "business.clearActivity",
        { type: "BUSINESS", label: days ? `Older than ${days} days` : "All history" },
        { details: `${deletedCount} entr${deletedCount === 1 ? "y" : "ies"} deleted` });
    }
    return NextResponse.json({ deleted: deletedCount });
  } catch (error) {
    console.error("Business activity DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete activity history" }, { status: 500 });
  }
}
