import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { auth } from "@/lib/auth";
import { getInventorySellerIds } from "@/lib/business";

export const dynamic = "force-dynamic";

// Inventory for the signed-in business user: only listings sold by members of their
// organization (all statuses), never the public marketplace feed.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const sellerIds = await getInventorySellerIds(session.user.id);

    const listings = await Listing.find({ sellerId: { $in: sellerIds } })
      .populate("sellerId", "name")
      .sort({ createdAt: -1 })
      .lean<Array<Record<string, unknown> & { sellerId?: { _id: unknown } | null }>>();

    // Edit/delete is only ever allowed on your own listings; the API enforces this too.
    const withPermissions = listings.map(l => ({
      ...l,
      canManage: String(l.sellerId?._id ?? "") === session.user.id,
    }));

    return NextResponse.json({ listings: withPermissions });
  } catch (error) {
    console.error("Business inventory error:", error);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}
