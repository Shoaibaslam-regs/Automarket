import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Rental } from "@/models/Rental";
import { loadOwnedBooking } from "@/lib/bookingAccess";
import { normalizeCnic, normalizePlate } from "@/lib/plates";
import { reportError } from "@/lib/errorLog";

/**
 * Sets the handover details on a booking: the vehicle's number plate and the renter's CNIC. Body: { plateNumber, cnic, dueBackAt? } (the return time only while the vehicle is out).
 * Allowed for the vehicle's owner, and for business members who manage bookings on their business's vehicles.
 * The plate is also remembered on the rental so the next handover is prefilled.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();

    const found = await loadOwnedBooking(session.user.id, id);
    if (!found.booking) return NextResponse.json({ error: found.error }, { status: found.status });
    const { booking, rentalId } = found;
    if (booking.status === "CANCELLED") return NextResponse.json({ error: "This booking was cancelled" }, { status: 400 });

    const { plateNumber, cnic, dueBackAt } = await req.json().catch(() => ({}));
    const plate = normalizePlate(plateNumber);
    if (!plate) return NextResponse.json({ error: "Enter the number plate, e.g. LEA-1234" }, { status: 400 });
    const renterCnic = normalizeCnic(cnic);
    if (!renterCnic) return NextResponse.json({ error: "Enter the renter's 13-digit CNIC, e.g. 35202-1234567-1" }, { status: 400 });

    // While the vehicle is out, the owner can correct the return time the renter was given
    if (dueBackAt !== undefined && dueBackAt !== null && dueBackAt !== "") {
      if (booking.status !== "ACTIVE") return NextResponse.json({ error: "The return time can only be changed while the vehicle is out" }, { status: 400 });
      const due = new Date(dueBackAt);
      if (isNaN(due.getTime())) return NextResponse.json({ error: "Enter a valid return date and time" }, { status: 400 });
      if (booking.startedAt && due <= booking.startedAt) return NextResponse.json({ error: "The return time must be after the handover" }, { status: 400 });
      booking.dueBackAt = due;
    }

    booking.plateNumber = plate;
    booking.renterCnic = renterCnic;
    await booking.save();
    if (rentalId) await Rental.updateOne({ _id: rentalId }, { $set: { plateNumber: plate } });
    return NextResponse.json({ plateNumber: plate, renterCnic, dueBackAt: booking.dueBackAt });
  } catch (error) {
    reportError("Booking handover details error:", error);
    return NextResponse.json({ error: "Failed to save the handover details" }, { status: 500 });
  }
}
