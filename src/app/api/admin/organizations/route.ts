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
      .populate("ownerId", "name email phone plan planExpiresAt")
      .sort({ createdAt: -1 })
      .lean() as Array<{
        _id: { toString: () => string };
        name: string;
        type: string;
        plan: string;
        city: string;
        isActive: boolean;
        createdAt: Date;
        ownerId: { _id: { toString: () => string }; name?: string; email: string; plan?: string; planExpiresAt?: Date };
      }>;

    const enriched = await Promise.all(
      orgs.map(async org => {
        const staffCount = await Employee.countDocuments({ organizationId: org._id });
        const vehicleCount = await Listing.countDocuments({ sellerId: org.ownerId?._id });
        // Plans live on the owner's account
        return { ...org, plan: effectivePlanId(org.ownerId?.plan, org.ownerId?.planExpiresAt), staffCount, vehicleCount };
      })
    );

    return NextResponse.json({ organizations: enriched });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
