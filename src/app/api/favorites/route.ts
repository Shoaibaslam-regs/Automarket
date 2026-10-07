import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Favorite } from "@/models/Favorite";
import { Listing } from "@/models/Listing";
import { auth } from "@/lib/auth";

// IDs of the current user's saved listings (the heart buttons only need to know which are saved)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const ids = await Favorite.find({ userId: session.user.id }).distinct("listingId");
    return NextResponse.json({ ids: ids.map(String) });
  } catch (error) {
    console.error("Get favorites error:", error);
    return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { listingId } = await req.json();
    if (typeof listingId !== "string" || !mongoose.Types.ObjectId.isValid(listingId)) {
      return NextResponse.json({ error: "Invalid listing" }, { status: 400 });
    }
    await connectDB();
    if (!(await Listing.exists({ _id: listingId }))) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    // Upsert so double-clicks or two tabs can't create duplicates or errors
    await Favorite.updateOne(
      { userId: session.user.id, listingId },
      { $setOnInsert: { userId: session.user.id, listingId } },
      { upsert: true }
    );
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("Add favorite error:", error);
    return NextResponse.json({ error: "Failed to save listing" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const listingId = req.nextUrl.searchParams.get("listingId");
    if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
      return NextResponse.json({ error: "Invalid listing" }, { status: 400 });
    }
    await connectDB();
    await Favorite.deleteOne({ userId: session.user.id, listingId });
    return NextResponse.json({ saved: false });
  } catch (error) {
    console.error("Remove favorite error:", error);
    return NextResponse.json({ error: "Failed to remove listing" }, { status: 500 });
  }
}
