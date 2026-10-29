import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";
import { getMembership } from "@/lib/business";
import { reportError } from "@/lib/errorLog";

const PRIVATE = { "Cache-Control": "private, no-store" };

/**
 * The visitor-specific part of a listing page, which is otherwise cached for everyone: whether the signed-in
 * visitor is its seller or on the seller's business team (who can't buy or report it).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const viewerId = session?.user?.id;
    if (!viewerId) return NextResponse.json({ signedIn: false, isOwner: false, isTeam: false }, { headers: PRIVATE });
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await connectDB();
    const listing = await Listing.findById(id).select("sellerId").lean<{ sellerId?: mongoose.Types.ObjectId }>();
    if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const sellerId = listing.sellerId ? String(listing.sellerId) : "";
    const isOwner = sellerId === viewerId;
    let isTeam = false;
    if (!isOwner && sellerId) {
      const [mine, seller] = await Promise.all([
        getMembership(viewerId),
        User.findById(sellerId).select("organizationId").lean<{ organizationId?: mongoose.Types.ObjectId }>(),
      ]);
      isTeam = !!mine && !!seller?.organizationId && String(seller.organizationId) === String(mine.organizationId);
    }
    return NextResponse.json({ signedIn: true, isOwner, isTeam }, { headers: PRIVATE });
  } catch (error) {
    reportError("Listing viewer error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
