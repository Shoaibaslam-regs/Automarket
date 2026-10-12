import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { BusinessReview } from "@/models/BusinessReview";
import { Organization } from "@/models/Organization";
import { canReviewBusiness, getBusinessRatings } from "@/lib/reviews";
import { triggerPusher } from "@/lib/support";

const PAGE_SIZE = 10;

async function findBusiness(slug: string) {
  return Organization.findOne({ slug, isActive: { $ne: false } }).select("_id name ownerId").lean<{ _id: mongoose.Types.ObjectId; name: string; ownerId: mongoose.Types.ObjectId }>();
}

/** Public: a page of a business's reviews with its rating summary. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1") || 1);
    await connectDB();
    const org = await findBusiness(slug);
    if (!org) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    const [reviews, ratings] = await Promise.all([
      BusinessReview.find({ organizationId: org._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .populate("reviewerId", "name image")
        .lean(),
      getBusinessRatings([String(org._id)]),
    ]);
    const summary = ratings.get(String(org._id)) ?? { average: 0, count: 0 };
    return NextResponse.json({ reviews, summary, hasMore: page * PAGE_SIZE < summary.count });
  } catch (error) {
    console.error("Business reviews GET error:", error);
    return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 });
  }
}

/** Creates or updates the signed-in customer's review of the business. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Sign in to leave a review" }, { status: 401 });
    const { slug } = await params;
    const { rating, comment } = await req.json().catch(() => ({}));
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Choose a rating from 1 to 5 stars" }, { status: 400 });
    }
    const text = typeof comment === "string" ? comment.trim() : "";
    if (text.length < 10 || text.length > 1000) {
      return NextResponse.json({ error: "Please write between 10 and 1000 characters" }, { status: 400 });
    }

    await connectDB();
    const org = await findBusiness(slug);
    if (!org) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    if (!(await canReviewBusiness(session.user.id, String(org._id)))) {
      return NextResponse.json(
        { error: "You can review a business after booking with it, messaging its team, or being one of its customers" },
        { status: 403 }
      );
    }

    const existing = await BusinessReview.exists({ organizationId: org._id, reviewerId: session.user.id });
    const review = await BusinessReview.findOneAndUpdate(
      { organizationId: org._id, reviewerId: session.user.id },
      // An edited review is new content, so any earlier reply no longer answers it
      { $set: { rating, comment: text }, ...(existing && { $unset: { reply: "" } }) },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ).populate("reviewerId", "name image");

    await triggerPusher(`user-${org.ownerId}`, "new-notification", { type: "review", rating });
    return NextResponse.json({ review });
  } catch (error) {
    console.error("Business review POST error:", error);
    return NextResponse.json({ error: "Failed to save review" }, { status: 500 });
  }
}

/** Deletes the signed-in customer's own review. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { slug } = await params;
    await connectDB();
    const org = await findBusiness(slug);
    if (!org) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    await BusinessReview.deleteOne({ organizationId: org._id, reviewerId: session.user.id });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Business review DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
  }
}
