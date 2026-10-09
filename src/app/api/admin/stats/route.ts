import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Listing } from "@/models/Listing";
import { Booking } from "@/models/Booking";
import { requireAdminApi } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const gate = await requireAdminApi("read");
    if (!gate.ok) return gate.response;

    await connectDB();

    const [
      totalUsers,
      totalListings,
      activeListings,
      totalBookings,
      confirmedBookings,
      completedBookings,
      recentUsers,
      recentListings,
    ] = await Promise.all([
      User.countDocuments(),
      Listing.countDocuments(),
      Listing.countDocuments({ status: "ACTIVE" }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: "CONFIRMED" }),
      Booking.countDocuments({ status: "COMPLETED" }),
      User.find().sort({ createdAt: -1 }).limit(5).select("name email role createdAt").lean(),
      Listing.find().sort({ createdAt: -1 }).limit(5).select("title make model year price status createdAt").lean(),
    ]);

    const completedBookingDocs = await Booking.find({ status: "COMPLETED" })
      .select("totalAmount deposit").lean();
    const totalRevenue = completedBookingDocs.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const platformFee = Math.round(totalRevenue * 0.04);

    return NextResponse.json({
      stats: {
        totalUsers,
        totalListings,
        activeListings,
        totalBookings,
        confirmedBookings,
        completedBookings,
        totalRevenue,
        platformFee,
      },
      recentUsers,
      recentListings,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
