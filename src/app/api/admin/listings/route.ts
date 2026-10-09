import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { requireAdminApi } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const gate = await requireAdminApi("read");
    if (!gate.ok) return gate.response;
    await connectDB();
    const listings = await Listing.find()
      .populate("sellerId", "name email")
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ listings });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
