import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Listing } from "@/models/Listing";
import { Booking } from "@/models/Booking";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
