import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdminApi } from "@/lib/adminAuth";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { Listing } from "@/models/Listing";
import { Deal } from "@/models/Deal";
import { Report } from "@/models/Report";
import { getOrgUserIds } from "@/lib/business";
import { liveQuery } from "@/lib/publicDeals";
import type { BadgeFacts } from "@/lib/badgeChecks";
import { reportError } from "@/lib/errorLog";

/** The facts the Verified badge dialog checks before an admin approves (src/lib/badgeChecks.ts). Read only. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi("badges");
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    await connectDB();
    const org = await Organization.findById(id).select("phone address city logo description createdAt")
      .lean<{ _id: mongoose.Types.ObjectId; phone?: string; address?: string; city?: string; logo?: string; description?: string; createdAt: Date }>();
    if (!org) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    const sellerIds = await getOrgUserIds(org._id);
    const [liveListings, liveDeals, openReports] = await Promise.all([
      Listing.countDocuments({ sellerId: { $in: sellerIds }, status: "ACTIVE" }),
      Deal.countDocuments({ organizationId: org._id, ...liveQuery(new Date()) }),
      Report.countDocuments({ targetType: "BUSINESS", targetId: org._id, status: "OPEN" }),
    ]);
    const has = (v?: string) => !!v?.trim();
    const facts: BadgeFacts = {
      phone: has(org.phone), address: has(org.address), city: has(org.city), logo: has(org.logo), description: has(org.description),
      liveListings, liveDeals, openReports, ageDays: Math.floor((Date.now() - new Date(org.createdAt).getTime()) / 86_400_000),
    };
    return NextResponse.json({ facts });
  } catch (error) {
    reportError("Admin badge checks error:", error);
    return NextResponse.json({ error: "Failed to load the checks" }, { status: 500 });
  }
}
