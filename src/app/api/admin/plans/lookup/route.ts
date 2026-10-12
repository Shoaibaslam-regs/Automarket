import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdminApi } from "@/lib/adminAuth";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { effectivePlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

const LIMIT = 10;
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type Oid = mongoose.Types.ObjectId;
type PlanUser = {
  _id: Oid; name?: string; email: string; role: string; organizationId?: Oid;
  plan?: string; planExpiresAt?: Date; planSource?: string; trialUsedAt?: Date; trialPlan?: string;
};
const USER_FIELDS = "name email role organizationId plan planExpiresAt planSource trialUsedAt trialPlan";

/**
 * Finds the accounts that hold plans, by person (name, email, full or short ID) or by business name.
 * A business match returns its owner, since plans live on the owner's account.
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  try {
    const q = (req.nextUrl.searchParams.get("q") || "").trim().replace(/^#/, "");
    if (q.length < 2) return NextResponse.json({ results: [] });
    const rx = { $regex: escapeRegex(q), $options: "i" };

    const idClauses: object[] = [];
    if (mongoose.Types.ObjectId.isValid(q) && q.length === 24) idClauses.push({ _id: new mongoose.Types.ObjectId(q) });
    // Users and admins see IDs as their last 6 characters, so match on the end of the id
    else if (/^[0-9a-f]{4,23}$/i.test(q)) idClauses.push({ $expr: { $regexMatch: { input: { $toString: "$_id" }, regex: `${q.toLowerCase()}$` } } });

    const orgs = await Organization.find({ $or: [{ name: rx }, { slug: rx }, ...idClauses] })
      .select("name slug ownerId")
      .limit(LIMIT)
      .lean<Array<{ _id: Oid; name: string; slug: string; ownerId: Oid }>>();

    const users = await User.find({ $or: [{ name: rx }, { email: rx }, ...idClauses, { _id: { $in: orgs.map(o => o.ownerId) } }] })
      .select(USER_FIELDS)
      .limit(LIMIT * 2)
      .lean<PlanUser[]>();

    // Businesses each user owns or works at, for context in the results
    const orgIds = [...new Set(users.map(u => u.organizationId).filter(Boolean).map(String))];
    const memberOrgs = await Organization.find({ _id: { $in: orgIds } }).select("name slug ownerId").lean<Array<{ _id: Oid; name: string; slug: string; ownerId: Oid }>>();
    const orgById = new Map(memberOrgs.map(o => [String(o._id), o]));

    const results = users.slice(0, LIMIT).map(u => {
      const org = u.organizationId ? orgById.get(String(u.organizationId)) : undefined;
      const effective = effectivePlanId(u.plan, u.planExpiresAt);
      return {
        id: String(u._id),
        name: u.name || u.email,
        email: u.email,
        role: u.role,
        business: org ? { name: org.name, slug: org.slug, isOwner: String(org.ownerId) === String(u._id) } : null,
        plan: effective,
        expiresAt: effective === "FREE" ? null : u.planExpiresAt ?? null,
        source: effective === "FREE" ? null : u.planSource ?? null,
        trialUsedAt: u.trialUsedAt ?? null,
        trialPlan: u.trialPlan ?? null,
      };
    });
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Plan lookup error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
