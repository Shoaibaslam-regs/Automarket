import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { Employee } from "@/models/Employee";
import { Listing } from "@/models/Listing";
import { requireAdminApi } from "@/lib/adminAuth";
import { effectivePlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const gate = await requireAdminApi("read");
    if (!gate.ok) return gate.response;
    await connectDB();

    const orgs = await Organization.find()
      .populate("ownerId", "name email phone plan planExpiresAt planSource")
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
      }>;

    const enriched = await Promise.all(
      orgs.map(async org => {
        const staffCount = await Employee.countDocuments({ organizationId: org._id });
        const vehicleCount = await Listing.countDocuments({ sellerId: org.ownerId?._id });
        // Plans live on the owner's account
        const plan = effectivePlanId(org.ownerId?.plan, org.ownerId?.planExpiresAt);
        return {
          ...org,
          plan,
          planExpiresAt: plan === "FREE" ? null : org.ownerId?.planExpiresAt ?? null,
          planSource: plan === "FREE" ? null : org.ownerId?.planSource ?? null,
          staffCount,
          vehicleCount,
        };
      })
    );

    return NextResponse.json({ organizations: enriched });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
