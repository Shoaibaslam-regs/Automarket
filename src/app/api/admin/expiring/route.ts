import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireAdminApi } from "@/lib/adminAuth";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { planInfo } from "@/lib/plans";
import { BUSINESS_FREE_DAYS, BUSINESS_FREE_GRACE_UNTIL, businessFreeUntil, everHadPlan } from "@/lib/businessPlan";
import { reportError } from "@/lib/errorLog";

export const dynamic = "force-dynamic";
type Oid = mongoose.Types.ObjectId;
const DAY = 86_400_000;

export type ExpiringRow = {
  kind: "PLAN" | "FREE" | "BADGE";
  label: string;
  endsAt: string;
  person: { id: string; name?: string; email: string; phone?: string };
  business: { id: string; name: string; slug: string } | null;
};

/**
 * Admin → Requests → Expiring soon: paid plans (business or private), businesses' free months and Verified badges
 * ending in the next 7 days or that ended in the last 7, soonest first, so the team can follow up before they lapse.
 * Read-only.
 */
export async function GET() {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  try {
    await connectDB();
    const now = Date.now();
    const from = new Date(now - 7 * DAY), to = new Date(now + 7 * DAY);
    const graceInWindow = BUSINESS_FREE_GRACE_UNTIL >= from && BUSINESS_FREE_GRACE_UNTIL <= to;

    const [planUsers, badgeOrgs, freeOrgs] = await Promise.all([
      User.find({ plan: { $ne: "FREE" }, planExpiresAt: { $gte: from, $lte: to } }).select("name email phone plan planExpiresAt").limit(300)
        .lean<Array<{ _id: Oid; name?: string; email: string; phone?: string; plan: string; planExpiresAt: Date }>>(),
      Organization.find({ "verification.expiresAt": { $gte: from, $lte: to } }).select("name slug ownerId verification.expiresAt").limit(300)
        .lean<Array<{ _id: Oid; name: string; slug: string; ownerId: Oid; verification: { expiresAt: Date } }>>(),
      Organization.find({
        isActive: { $ne: false },
        $or: [
          { createdAt: { $gte: new Date(from.getTime() - BUSINESS_FREE_DAYS * DAY), $lte: new Date(to.getTime() - BUSINESS_FREE_DAYS * DAY) } },
          ...(graceInWindow ? [{ createdAt: { $lte: new Date(BUSINESS_FREE_GRACE_UNTIL.getTime() - BUSINESS_FREE_DAYS * DAY) } }] : []),
        ],
      }).select("name slug ownerId createdAt").limit(300).lean<Array<{ _id: Oid; name: string; slug: string; ownerId: Oid; createdAt: Date }>>(),
    ]);

    const ownerIds = [...badgeOrgs, ...freeOrgs].map(o => o.ownerId);
    const [owners, ownedOrgs] = await Promise.all([
      User.find({ _id: { $in: ownerIds } }).select("name email phone plan planSource trialUsedAt").lean<Array<{ _id: Oid; name?: string; email: string; phone?: string; plan?: string; planSource?: string; trialUsedAt?: Date }>>(),
      Organization.find({ ownerId: { $in: planUsers.map(u => u._id) } }).select("name slug ownerId").lean<Array<{ _id: Oid; name: string; slug: string; ownerId: Oid }>>(),
    ]);
    const ownerById = new Map(owners.map(o => [String(o._id), o]));
    const orgByOwner = new Map(ownedOrgs.map(o => [String(o.ownerId), o]));
    const person = (u: { _id: Oid; name?: string; email: string; phone?: string }) => ({ id: String(u._id), name: u.name, email: u.email, phone: u.phone });
    const biz = (o: { _id: Oid; name: string; slug: string } | undefined) => (o ? { id: String(o._id), name: o.name, slug: o.slug } : null);

    const rows: ExpiringRow[] = [
      ...planUsers.map(u => ({ kind: "PLAN" as const, label: `${planInfo(u.plan).name} plan`, endsAt: u.planExpiresAt.toISOString(), person: person(u), business: biz(orgByOwner.get(String(u._id))) })),
      ...badgeOrgs.flatMap(o => {
        const owner = ownerById.get(String(o.ownerId));
        return owner ? [{ kind: "BADGE" as const, label: "Verified badge", endsAt: o.verification.expiresAt.toISOString(), person: person(owner), business: biz(o) }] : [];
      }),
      ...freeOrgs.flatMap(o => {
        const owner = ownerById.get(String(o.ownerId));
        const endsAt = businessFreeUntil(o.createdAt);
        if (!owner || everHadPlan(owner) || endsAt < from || endsAt > to) return [];
        return [{ kind: "FREE" as const, label: "Free month", endsAt: endsAt.toISOString(), person: person(owner), business: biz(o) }];
      }),
    ].sort((a, b) => a.endsAt.localeCompare(b.endsAt));

    return NextResponse.json({ rows });
  } catch (error) {
    reportError("Admin expiring GET error:", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
