import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { Customer } from "@/models/Customer";
import { Booking } from "@/models/Booking";
import { User } from "@/models/User";
import { auth } from "@/lib/auth";
import { getBusinessRentals, getOrgUserIds } from "@/lib/business";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user?.organizationId) return NextResponse.json({ error: "No organization" }, { status: 404 });

    const orgId = user.organizationId;

    // Bookings have no organization field; they belong to the business through its rental vehicles
    const rentalIds = (await getBusinessRentals(session.user.id)).map(r => r._id);

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const memberIds = await getOrgUserIds(orgId);
    // Bookings finished before completedAt existed fall back to their last update as the completion time
    const completedOn = { $ifNull: ["$completedAt", "$updatedAt"] };
    const sixMonthsAgo = new Date(thisMonth);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

    const [
      totalVehicles,
      available,
      sold,
      reserved,
      totalCustomers,
      leads,
      testDrives,
      closedSales,
      bookingsByStatus,
      bookingsBySource,
      revenueByMonth,
      revenueTotal,
      depositsHeld,
      monthlySales,
    ] = await Promise.all([
      Listing.countDocuments({ sellerId: { $in: memberIds } }),
      Listing.countDocuments({ sellerId: { $in: memberIds }, status: "ACTIVE" }),
      Listing.countDocuments({ sellerId: { $in: memberIds }, status: "SOLD" }),
      Listing.countDocuments({ sellerId: { $in: memberIds }, status: "PENDING" }),
      Customer.countDocuments({ organizationId: orgId }),
      Customer.countDocuments({ organizationId: orgId, status: "LEAD" }),
      Customer.countDocuments({ organizationId: orgId, status: "TEST_DRIVE" }),
      Customer.countDocuments({ organizationId: orgId, status: "SOLD" }),
      Booking.aggregate<{ _id: string; count: number }>([
        { $match: { rentalId: { $in: rentalIds } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Booking.aggregate<{ _id: string | null; count: number }>([
        { $match: { rentalId: { $in: rentalIds }, status: { $ne: "CANCELLED" } } },
        { $group: { _id: "$source", count: { $sum: 1 } } },
      ]),
      Booking.aggregate<{ _id: { y: number; m: number }; total: number }>([
        { $match: { rentalId: { $in: rentalIds }, status: "COMPLETED" } },
        { $addFields: { doneAt: completedOn } },
        { $match: { doneAt: { $gte: sixMonthsAgo } } },
        { $group: { _id: { y: { $year: "$doneAt" }, m: { $month: "$doneAt" } }, total: { $sum: "$totalAmount" } } },
      ]),
      Booking.aggregate<{ total: number }>([
        { $match: { rentalId: { $in: rentalIds }, status: "COMPLETED" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      // Deposits currently held for vehicles that are out
      Booking.aggregate<{ total: number }>([
        { $match: { rentalId: { $in: rentalIds }, status: "ACTIVE" } },
        { $group: { _id: null, total: { $sum: "$deposit" } } },
      ]),
      Listing.aggregate<{ count: number; value: number }>([
        { $match: { sellerId: { $in: memberIds }, status: "SOLD", updatedAt: { $gte: thisMonth } } },
        { $group: { _id: null, count: { $sum: 1 }, value: { $sum: "$price" } } },
      ]),
    ]);

    const byStatus = (s: string) => bookingsByStatus.find(x => x._id === s)?.count ?? 0;
    const totalBookings = bookingsByStatus.reduce((sum, x) => sum + (x._id === "CANCELLED" ? 0 : x.count), 0);

    // Last six months, oldest first, with empty months filled in
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(sixMonthsAgo);
      d.setMonth(d.getMonth() + i);
      const hit = revenueByMonth.find(r => r._id.y === d.getFullYear() && r._id.m === d.getMonth() + 1);
      return { month: d.toLocaleDateString("en-PK", { month: "short" }), revenue: hit?.total ?? 0 };
    });

    return NextResponse.json({
      inventory: { totalVehicles, available, sold, reserved },
      customers: { totalCustomers, leads, testDrives, closedSales },
      rentals: {
        totalBookings,
        activeRentals: byStatus("ACTIVE"),
        pending: byStatus("PENDING"),
        upcoming: byStatus("CONFIRMED"),
        completed: byStatus("COMPLETED"),
        cancelled: byStatus("CANCELLED"),
        online: bookingsBySource.filter(x => x._id !== "WALK_IN").reduce((sum, x) => sum + x.count, 0),
        walkIn: bookingsBySource.find(x => x._id === "WALK_IN")?.count ?? 0,
        revenueThisMonth: months[months.length - 1].revenue,
        revenueTotal: revenueTotal[0]?.total ?? 0,
        depositsHeld: depositsHeld[0]?.total ?? 0,
        revenueByMonth: months,
      },
      monthly: {
        sales: monthlySales[0]?.count ?? 0,
        // Value of vehicles marked sold this month (listing prices)
        revenue: monthlySales[0]?.value ?? 0,
      },
    });
  } catch (error) {
    console.error("Business stats error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

