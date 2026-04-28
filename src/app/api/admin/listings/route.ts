import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
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
    const listings = await Listing.find()
      .populate("sellerId", "name email")
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ listings });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
