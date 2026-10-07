import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { Customer } from "@/models/Customer";
import { Booking } from "@/models/Booking";
import { User } from "@/models/User";
import { auth } from "@/lib/auth";
import { getOrgUserIds } from "@/lib/business";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user?.organizationId) return NextResponse.json({ error: "No organization" }, { status: 404 });

    const orgId = user.organizationId;

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const [
      totalVehicles,
      available,
      sold,
      reserved,
      totalCustomers,
      leads,
      testDrives,
      closedSales,
      totalBookings,
      activeRentals,
    ] = await Promise.all([
      Listing.countDocuments({ sellerId: { $in: await getOrgUserIds(orgId) } }),
      Listing.countDocuments({ sellerId: { $in: await getOrgUserIds(orgId) }, status: "ACTIVE" }),
      Listing.countDocuments({ sellerId: { $in: await getOrgUserIds(orgId) }, status: "SOLD" }),
      Listing.countDocuments({ sellerId: { $in: await getOrgUserIds(orgId) }, status: "PENDING" }),
      Customer.countDocuments({ organizationId: orgId }),
      Customer.countDocuments({ organizationId: orgId, status: "LEAD" }),
      Customer.countDocuments({ organizationId: orgId, status: "TEST_DRIVE" }),
      Customer.countDocuments({ organizationId: orgId, status: "SOLD" }),
      Booking.countDocuments({ organizationId: orgId }),
      Booking.countDocuments({ organizationId: orgId, status: "ACTIVE" }),
    ]);

    const monthlyRevenue = await Booking.aggregate([
      { $match: { organizationId: orgId, status: "COMPLETED", createdAt: { $gte: thisMonth } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    const monthlySales = await Listing.countDocuments({
      sellerId: { $in: await getOrgUserIds(orgId) },
      status: "SOLD",
      updatedAt: { $gte: thisMonth },
    });

    return NextResponse.json({
      inventory: { totalVehicles, available, sold, reserved },
      customers: { totalCustomers, leads, testDrives, closedSales },
      rentals: { totalBookings, activeRentals },
      monthly: {
        sales: monthlySales,
        revenue: monthlyRevenue[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("Business stats error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

