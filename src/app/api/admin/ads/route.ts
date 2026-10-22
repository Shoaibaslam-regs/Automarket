import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdminApi } from "@/lib/adminAuth";
import { Ad } from "@/models/Ad";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";

type Oid = mongoose.Types.ObjectId;

/**
 * Sponsored ads for Admin → Ad requests. `?tab=REQUESTED` (default) waiting requests, `LIVE` approved and
 * not ended yet, `PAST` everything else. `?count=1` returns only the number waiting, for the sidebar badge.
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  try {
    const waiting = await Ad.countDocuments({ status: "REQUESTED" });
    if (req.nextUrl.searchParams.get("count")) return NextResponse.json({ waiting });

    const now = new Date();
    const tab = req.nextUrl.searchParams.get("tab") || "REQUESTED";
    const filter =
      tab === "LIVE" ? { status: "APPROVED", endsAt: { $gt: now } }
      : tab === "PAST" ? { $or: [{ status: { $in: ["REJECTED", "CANCELLED", "STOPPED"] } }, { status: "APPROVED", endsAt: { $lte: now } }] }
      : { status: "REQUESTED" };
    const sort: Record<string, 1 | -1> = tab === "LIVE" ? { startsAt: 1 } : tab === "PAST" ? { updatedAt: -1 } : { createdAt: 1 };
    const ads = await Ad.find(filter).sort(sort).limit(200)
      .lean<Array<{ organizationId: Oid; requestedBy: Oid; handledBy?: Oid }>>();

    const userIds = [...new Set(ads.flatMap(a => [a.requestedBy, a.handledBy].filter(Boolean).map(String)))];
    const orgIds = [...new Set(ads.map(a => String(a.organizationId)))];
    const [users, orgs, running] = await Promise.all([
      User.find({ _id: { $in: userIds } }).select("name email").lean<Array<{ _id: Oid; name?: string; email: string }>>(),
      Organization.find({ _id: { $in: orgIds } }).select("name slug isActive").lean<Array<{ _id: Oid; name: string; slug: string; isActive?: boolean }>>(),
      Ad.countDocuments({ status: "APPROVED", startsAt: { $lte: now }, endsAt: { $gt: now } }),
    ]);
    const userById = new Map(users.map(u => [String(u._id), u]));
    const orgById = new Map(orgs.map(o => [String(o._id), o]));

    return NextResponse.json({
      waiting,
      running,
      ads: ads.map(a => ({
        ...a,
        business: orgById.get(String(a.organizationId)) ?? null,
        requester: userById.get(String(a.requestedBy)) ?? null,
        handler: a.handledBy ? userById.get(String(a.handledBy)) ?? null : null,
      })),
    });
  } catch (error) {
    console.error("Admin ads GET error:", error);
    return NextResponse.json({ error: "Failed to load ads" }, { status: 500 });
  }
}
