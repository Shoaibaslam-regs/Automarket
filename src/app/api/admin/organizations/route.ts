import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { Employee } from "@/models/Employee";
import { Listing } from "@/models/Listing";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await connectDB();

    const orgs = await Organization.find()
      .populate("ownerId", "name email phone")
      .sort({ createdAt: -1 })
      .lean() as Array<{
        _id: { toString: () => string };
        name: string;
        type: string;
        plan: string;
        city: string;
        isActive: boolean;
        createdAt: Date;
        ownerId: { _id: { toString: () => string }; name?: string; email: string };
      }>;

    const enriched = await Promise.all(
      orgs.map(async org => {
        const staffCount = await Employee.countDocuments({ organizationId: org._id });
        const vehicleCount = await Listing.countDocuments({ sellerId: org.ownerId?._id });
        return { ...org, staffCount, vehicleCount };
      })
    );

    return NextResponse.json({ organizations: enriched });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
