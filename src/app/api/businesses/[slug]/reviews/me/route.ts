import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { BusinessReview } from "@/models/BusinessReview";
import { getOrgUserIds } from "@/lib/business";
import { canReviewBusiness } from "@/lib/reviews";
import { toReviewView } from "@/components/reviews/types";
import { reportError } from "@/lib/errorLog";

const PRIVATE = { "Cache-Control": "private, no-store" };

/**
 * The visitor-specific part of a business page, which is otherwise cached for everyone: the signed-in visitor's
 * own review and whether they may write one ("anon", "member" of the business, "eligible" or "ineligible").
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth();
    const viewerId = session?.user?.id;
    if (!viewerId) return NextResponse.json({ viewer: "anon", myReview: null }, { headers: PRIVATE });
    const { slug } = await params;
    await connectDB();
    const org = await Organization.findOne({ slug, isActive: { $ne: false } }).select("_id").lean<{ _id: mongoose.Types.ObjectId }>();
    if (!org) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    const [memberIds, mine, eligible] = await Promise.all([
      getOrgUserIds(org._id),
      BusinessReview.findOne({ organizationId: org._id, reviewerId: viewerId }).populate("reviewerId", "name image").lean(),
      canReviewBusiness(viewerId, String(org._id)),
    ]);
    const viewer = memberIds.map(String).includes(viewerId) ? "member" : eligible || mine ? "eligible" : "ineligible";
    return NextResponse.json(
      { viewer, myReview: mine ? toReviewView(mine as unknown as Parameters<typeof toReviewView>[0]) : null },
      { headers: PRIVATE }
    );
  } catch (error) {
    reportError("Business review viewer error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
