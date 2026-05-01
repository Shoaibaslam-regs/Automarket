import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Listing } from "@/models/Listing";
import { Booking } from "@/models/Booking";
import { Message } from "@/models/Message";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

function getLast30Days() {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

function getLast12Weeks() {
  const weeks = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    d.setHours(0, 0, 0, 0);
    weeks.push(d);
  }
  return weeks;
}

function getLast12Months() {
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    months.push(d);
  }
  return months;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const days = getLast30Days();
    const weeks = getLast12Weeks();
    const months = getLast12Months();

    // Daily data — last 30 days
    const dailyData = await Promise.all(
      days.map(async (day) => {
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);

        const [users, listings, bookings, messages] = await Promise.all([
          User.countDocuments({ createdAt: { $gte: day, $lt: nextDay } }),
          Listing.countDocuments({ createdAt: { $gte: day, $lt: nextDay } }),
          Booking.countDocuments({ createdAt: { $gte: day, $lt: nextDay } }),
          Message.countDocuments({ createdAt: { $gte: day, $lt: nextDay } }),
        ]);

        return {
          date: day.toLocaleDateString("en-PK", { month: "short", day: "numeric" }),
          users,
          listings,
          bookings,
          messages,
        };
      })
    );

    // Weekly data — last 12 weeks
    const weeklyData = await Promise.all(
      weeks.map(async (week, i) => {
        const nextWeek = new Date(week);
        nextWeek.setDate(nextWeek.getDate() + 7);

        const [users, listings, bookings] = await Promise.all([
          User.countDocuments({ createdAt: { $gte: week, $lt: nextWeek } }),
          Listing.countDocuments({ createdAt: { $gte: week, $lt: nextWeek } }),
          Booking.countDocuments({ createdAt: { $gte: week, $lt: nextWeek } }),
        ]);

        return {
          date: `W${i + 1}`,
          fullDate: week.toLocaleDateString("en-PK", { month: "short", day: "numeric" }),
          users,
          listings,
          bookings,
        };
      })
    );

    // Monthly data — last 12 months
    const monthlyData = await Promise.all(
      months.map(async (month) => {
        const nextMonth = new Date(month);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        const [users, listings, bookings, revenue] = await Promise.all([
          User.countDocuments({ createdAt: { $gte: month, $lt: nextMonth } }),
          Listing.countDocuments({ createdAt: { $gte: month, $lt: nextMonth } }),
          Booking.countDocuments({ createdAt: { $gte: month, $lt: nextMonth } }),
          Booking.aggregate([
            { $match: { createdAt: { $gte: month, $lt: nextMonth }, status: "COMPLETED" } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } },
          ]),
        ]);

        return {
          date: month.toLocaleDateString("en-PK", { month: "short", year: "2-digit" }),
          users,
          listings,
          bookings,
          revenue: revenue[0]?.total || 0,
        };
      })
    );

    // Top stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      newUsersThisMonth,
      newListingsThisMonth,
      newBookingsThisMonth,
      totalMessages,
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Listing.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Booking.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Message.countDocuments(),
    ]);

    return NextResponse.json({
      dailyData,
      weeklyData,
      monthlyData,
      summary: {
        newUsersThisMonth,
        newListingsThisMonth,
        newBookingsThisMonth,
        totalMessages,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
