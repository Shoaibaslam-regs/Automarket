import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking";
import { holdsDatesQuery } from "@/lib/bookings";

export async function GET(
  req: NextRequest, 
 { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const bookings = await Booking.find({
      rentalId: id,
      // The same bookings that refuse a new request (an unanswered one stops holding its dates after a while)
      ...holdsDatesQuery(),
    }).select("startDate endDate").lean();

    return NextResponse.json({ bookedDates: bookings });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}
