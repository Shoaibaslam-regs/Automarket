import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const bookings = await Booking.find({
      rentalId: id,
      status: { $in: ["PENDING", "CONFIRMED", "ACTIVE"] },
    }).select("startDate endDate").lean();

    return NextResponse.json({ bookedDates: bookings });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}
