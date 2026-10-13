import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking";
import { Rental } from "@/models/Rental";
import { can, getBusinessRentals, getMembership } from "@/lib/business";
import { normalizePlate } from "@/lib/plates";

/**
 * Sets the number plate of the vehicle on a booking. Body: { plateNumber }.
 * Allowed for the vehicle's owner, and for business members who manage bookings on their business's vehicles.
 * The plate is also remembered on the rental so the next handover is prefilled.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    await connectDB();

    const booking = await Booking.findById(id);
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    const rental = await Rental.findById(booking.rentalId).select("ownerId");
    if (!rental) return NextResponse.json({ error: "This vehicle no longer exists" }, { status: 404 });

    let allowed = String(rental.ownerId) === session.user.id;
    if (!allowed) {
      const member = await getMembership(session.user.id);
      allowed = !!member && can(member.role, "manageBookings") &&
        (await getBusinessRentals(session.user.id)).some(r => r._id.equals(rental._id));
    }
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (booking.status === "CANCELLED") return NextResponse.json({ error: "This booking was cancelled" }, { status: 400 });

    const { plateNumber } = await req.json().catch(() => ({}));
    const plate = normalizePlate(plateNumber);
    if (!plate) return NextResponse.json({ error: "Enter the number plate, e.g. LEA-1234" }, { status: 400 });

    booking.plateNumber = plate;
    await booking.save();
    await Rental.updateOne({ _id: rental._id }, { $set: { plateNumber: plate } });
    return NextResponse.json({ plateNumber: plate });
  } catch (error) {
    console.error("Booking plate error:", error);
    return NextResponse.json({ error: "Failed to save the number plate" }, { status: 500 });
  }
}
