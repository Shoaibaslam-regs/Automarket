import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Review } from "@/models/Review";
import { User } from "@/models/User";
import { auth } from "@/lib/auth";
import { canReviewSeller, getSellerRatings } from "@/lib/reviews";

const PAGE_SIZE = 10;

export async function GET(req: NextRequest) {
  try {
    const sellerId = req.nextUrl.searchParams.get("sellerId");
    if (!sellerId || !mongoose.Types.ObjectId.isValid(sellerId)) {
      return NextResponse.json({ error: "Invalid seller" }, { status: 400 });
    }
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1") || 1);

    await connectDB();
    const [reviews, ratings] = await Promise.all([
      Review.find({ sellerId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .populate("reviewerId", "name image")
        .lean(),
      getSellerRatings([sellerId]),
    ]);
    const summary = ratings.get(sellerId) ?? { average: 0, count: 0 };
    return NextResponse.json({ reviews, summary, hasMore: page * PAGE_SIZE < summary.count });
  } catch (error) {
    console.error("Get reviews error:", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

// Create or update the current user's review of a seller
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sellerId, listingId, rating, comment } = await req.json();
    if (typeof sellerId !== "string" || !mongoose.Types.ObjectId.isValid(sellerId)) {
      return NextResponse.json({ error: "Invalid seller" }, { status: 400 });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5 stars" }, { status: 400 });
    }
    const text = typeof comment === "string" ? comment.trim() : "";
    if (text.length < 10 || text.length > 1000) {
      return NextResponse.json({ error: "Please write between 10 and 1000 characters" }, { status: 400 });
    }

    await connectDB();
    if (!(await User.exists({ _id: sellerId }))) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }
    if (!(await canReviewSeller(session.user.id, sellerId))) {
      return NextResponse.json(
        { error: "You can review a seller after messaging them or booking one of their rentals" },
        { status: 403 }
      );
    }

    const review = await Review.findOneAndUpdate(
      { sellerId, reviewerId: session.user.id },
      {
        rating,
        comment: text,
        ...(typeof listingId === "string" && mongoose.Types.ObjectId.isValid(listingId) && { listingId }),
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ).populate("reviewerId", "name image");

    return NextResponse.json({ review });
  } catch (error) {
    console.error("Save review error:", error);
    return NextResponse.json({ error: "Failed to save review" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sellerId = req.nextUrl.searchParams.get("sellerId");
    if (!sellerId || !mongoose.Types.ObjectId.isValid(sellerId)) {
      return NextResponse.json({ error: "Invalid seller" }, { status: 400 });
    }
    await connectDB();
    await Review.deleteOne({ sellerId, reviewerId: session.user.id });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Delete review error:", error);
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
  }
}
