import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking";
import { Rental } from "@/models/Rental";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";
import { auth } from "@/lib/auth";
import { sendBookingRequestEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");

    const query = role === "owner"
      ? {}
      : { renterId: session.user.id };

    const bookings = await Booking.find(query)
      .populate("rentalId")
      .populate("renterId", "name email phone")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Get bookings error:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { rentalId, startDate, endDate } = await req.json();

    if (!rentalId || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
    }

    if (start < new Date()) {
      return NextResponse.json({ error: "Start date cannot be in the past" }, { status: 400 });
    }

    const rental = await Rental.findById(rentalId);
    if (!rental) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }

    if (rental.ownerId.toString() === session.user.id) {
      return NextResponse.json({ error: "You cannot book your own vehicle" }, { status: 400 });
    }

    const conflict = await Booking.findOne({
      rentalId,
      status: { $in: ["PENDING", "CONFIRMED", "ACTIVE"] },
      $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }],
    });

    if (conflict) {
      return NextResponse.json({ error: "Vehicle is not available for selected dates" }, { status: 400 });
    }

    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const totalAmount = days * rental.dailyRate;
    const deposit = rental.deposit || 0;

    const booking = await Booking.create({
      rentalId,
      renterId: session.user.id,
      startDate: start,
      endDate: end,
      totalAmount,
      deposit,
      status: "PENDING",
    });

    // Send email notification to owner
    try {
      const listing = await Listing.findOne({ _id: rental.listingId }).lean() as { title: string } | null;
      const owner = await User.findById(rental.ownerId).lean() as { name?: string; email: string } | null;
      const renter = await User.findById(session.user.id).lean() as { name?: string; email: string; phone?: string } | null;

      if (owner && renter && listing) {
        await sendBookingRequestEmail({
          ownerEmail: owner.email,
          ownerName: owner.name ?? "Vehicle owner",
          renterName: renter.name ?? "A user",
          renterEmail: renter.email,
          renterPhone: renter.phone,
          listingTitle: listing.title,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          totalAmount,
          deposit,
          days,
          bookingId: booking._id.toString(),
        });
      }
    } catch (emailError) {
      console.error("Email send failed:", emailError);
    }

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error("Create booking error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
