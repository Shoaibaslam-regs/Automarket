import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { BusinessReview } from "@/models/BusinessReview";
import { Organization } from "@/models/Organization";
import { can, getMembership } from "@/lib/business";
import { getBusinessRatings } from "@/lib/reviews";
import { invalidateBusinessPage } from "@/lib/pageCache";
import { logBusinessAction } from "@/lib/businessLog";

export const dynamic = "force-dynamic";

/** The business's own reviews, for the console. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    const [reviews, ratings, org] = await Promise.all([
      BusinessReview.find({ organizationId: member.organizationId })
        .sort({ createdAt: -1 })
        .populate("reviewerId", "name image")
        .populate("reply.repliedBy", "name")
        .lean(),
      getBusinessRatings([String(member.organizationId)]),
      Organization.findById(member.organizationId).select("slug").lean<{ slug: string }>(),
    ]);
    return NextResponse.json({
      reviews,
      summary: ratings.get(String(member.organizationId)) ?? { average: 0, count: 0 },
      slug: org?.slug,
      permissions: { canReply: can(member.role, "replyReviews") },
    });
  } catch (error) {
    console.error("Business reviews console GET error:", error);
    return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 });
  }
}

/** Adds, edits or removes (empty text) the business's public reply to a review. */
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!can(member.role, "replyReviews")) {
      return NextResponse.json({ error: "Only the owner or a manager can reply to reviews" }, { status: 403 });
    }
    const { reviewId, text } = await req.json().catch(() => ({}));
    if (typeof reviewId !== "string" || !mongoose.Types.ObjectId.isValid(reviewId)) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    const reply = typeof text === "string" ? text.trim() : "";
    if (reply.length > 1000) return NextResponse.json({ error: "Replies can be up to 1000 characters" }, { status: 400 });

    const review = await BusinessReview.findOneAndUpdate(
      { _id: reviewId, organizationId: member.organizationId },
      reply
        ? { $set: { reply: { text: reply, repliedBy: session.user.id, repliedAt: new Date() } } }
        : { $unset: { reply: "" } },
      { new: true }
    );
    if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });
    await invalidateBusinessPage(member.organizationId);
    await logBusinessAction({ userId: session.user.id, organizationId: member.organizationId }, "review.reply",
      { type: "REVIEW", id: review._id, label: `${review.rating}★ review` }, { details: reply ? reply.slice(0, 120) : "Removed reply" });
    return NextResponse.json({ review });
  } catch (error) {
    console.error("Business review reply error:", error);
    return NextResponse.json({ error: "Failed to save reply" }, { status: 500 });
  }
}
