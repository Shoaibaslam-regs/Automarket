import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { Booking } from "@/models/Booking";
import { Message } from "@/models/Message";

export async function GET() {
  try {
    await connectDB();

    const listings = await Listing.countDocuments();
    const bookings = await Booking.countDocuments();
    const messages = await Message.countDocuments();

    return NextResponse.json({
      listings,
      bookings,
      messages,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 }
    );
  }
}