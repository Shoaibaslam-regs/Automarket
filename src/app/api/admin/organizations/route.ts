import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { Employee } from "@/models/Employee";
import { Listing } from "@/models/Listing";
import { requireAdminApi } from "@/lib/adminAuth";
import { effectivePlanId } from "@/lib/plans";
import { getOrgUserIds } from "@/lib/business";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const gate = await requireAdminApi("read");
    if (!gate.ok) return gate.response;
    await connectDB();

    const orgs = await Organization.find()
      .populate("ownerId", "name email phone plan planExpiresAt planSource")
      .populate("accountManagerId", "name email role")
      .sort({ createdAt: -1 })
      .lean() as Array<{
        _id: { toString: () => string };
        name: string;
        type: string;
        plan: string;
        city: string;
        isActive: boolean;
        createdAt: Date;
        ownerId: { _id: { toString: () => string }; name?: string; email: string; plan?: string; planExpiresAt?: Date; planSource?: string };
        accountManagerId?: { _id: { toString: () => string }; name?: string; email: string; role?: string } | null;
      }>;

    const enriched = await Promise.all(
      orgs.map(async org => {
        const staffCount = await Employee.countDocuments({ organizationId: org._id });
        // Inventory is every member's listings, not just the owner's
        const vehicleCount = await Listing.countDocuments({ sellerId: { $in: await getOrgUserIds(org._id) } });
        // Plans live on the owner's account
        const plan = effectivePlanId(org.ownerId?.plan, org.ownerId?.planExpiresAt);
        // Dedicated support: the account manager, while they're still an admin
        const m = org.accountManagerId;
        return {
          ...org,
          accountManagerId: undefined,
          accountManager: m && m.role === "ADMIN" ? { _id: String(m._id), name: m.name, email: m.email } : null,
          plan,
          planExpiresAt: plan === "FREE" ? null : org.ownerId?.planExpiresAt ?? null,
          planSource: plan === "FREE" ? null : org.ownerId?.planSource ?? null,
          staffCount,
          vehicleCount,
        };
      })
    );

    // Who can be picked as an account manager
    const admins = await User.find({ role: "ADMIN", isSupportAccount: { $ne: true } }).select("name email").sort({ name: 1 }).lean<Array<{ _id: { toString: () => string }; name?: string; email: string }>>();
    return NextResponse.json({ organizations: enriched, admins: admins.map(a => ({ _id: String(a._id), name: a.name, email: a.email })) });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
