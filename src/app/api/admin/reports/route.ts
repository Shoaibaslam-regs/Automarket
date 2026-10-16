import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdminApi } from "@/lib/adminAuth";
import { Report } from "@/models/Report";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";

type Oid = mongoose.Types.ObjectId;

/** Reports for the admin queue. `?status=OPEN|RESOLVED|DISMISSED` (default OPEN); `?count=1` returns only the open count. */
export async function GET(req: NextRequest) {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  try {
    const open = await Report.countDocuments({ status: "OPEN" });
    if (req.nextUrl.searchParams.get("count")) return NextResponse.json({ open });

    const status = req.nextUrl.searchParams.get("status") || "OPEN";
    const filter = ["OPEN", "RESOLVED", "DISMISSED"].includes(status) ? { status } : {};
    const reports = await Report.find(filter).sort({ createdAt: -1 }).limit(300)
      .lean<Array<{ _id: Oid; targetId: Oid; reporterId: Oid; organizationId?: Oid; handledBy?: Oid }>>();

    const userIds = [...new Set(reports.flatMap(r => [r.reporterId, r.handledBy].filter(Boolean).map(String)))];
    const orgIds = [...new Set(reports.map(r => r.organizationId).filter(Boolean).map(String))];
    const [users, orgs] = await Promise.all([
      User.find({ _id: { $in: userIds } }).select("name email").lean<Array<{ _id: Oid; name?: string; email: string }>>(),
      Organization.find({ _id: { $in: orgIds } }).select("name slug isActive").lean<Array<{ _id: Oid; name: string; slug: string; isActive?: boolean }>>(),
    ]);
    const userById = new Map(users.map(u => [String(u._id), u]));
    const orgById = new Map(orgs.map(o => [String(o._id), o]));
    // How many open reports each item has, so repeat reports stand out
    const tally = await Report.aggregate<{ _id: Oid; n: number }>([
      { $match: { status: "OPEN", targetId: { $in: reports.map(r => r.targetId) } } },
      { $group: { _id: "$targetId", n: { $sum: 1 } } },
    ]);
    const openFor = new Map(tally.map(t => [String(t._id), t.n]));

    return NextResponse.json({
      open,
      reports: reports.map(r => ({
        ...r,
        reporter: userById.get(String(r.reporterId)) ?? null,
        handler: r.handledBy ? userById.get(String(r.handledBy)) ?? null : null,
        business: r.organizationId ? orgById.get(String(r.organizationId)) ?? null : null,
        openForTarget: openFor.get(String(r.targetId)) ?? 0,
      })),
    });
  } catch (error) {
    console.error("Admin reports GET error:", error);
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 });
  }
}
