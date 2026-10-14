import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking";
import { Rental } from "@/models/Rental";
import { Deal } from "@/models/Deal";
import { can, getBusinessRentals, getMembership } from "@/lib/business";
import { normalizeCnic, normalizePlate } from "@/lib/plates";

/**
 * Sets the handover details on a booking: the vehicle's number plate and the renter's CNIC. Body: { plateNumber, cnic }.
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
    let allowed = false;
    let rentalId: mongoose.Types.ObjectId | null = null;
    if (booking.organizationId && !booking.rentalId && !booking.dealId) {
      // Walk-in for a vehicle the business hasn't listed
      const member = await getMembership(session.user.id);
      allowed = !!member && can(member.role, "manageBookings") && member.organizationId.equals(booking.organizationId);
    } else if (booking.dealId) {
      // Deal bookings belong to the deal's business; its booking managers handle them
      const deal = await Deal.findById(booking.dealId).select("organizationId").lean<{ organizationId: mongoose.Types.ObjectId }>();
      if (!deal) return NextResponse.json({ error: "This deal no longer exists" }, { status: 404 });
      const member = await getMembership(session.user.id);
      allowed = !!member && can(member.role, "manageBookings") && member.organizationId.equals(deal.organizationId);
    } else {
      const rental = await Rental.findById(booking.rentalId).select("ownerId");
      if (!rental) return NextResponse.json({ error: "This vehicle no longer exists" }, { status: 404 });
      rentalId = rental._id;
      allowed = String(rental.ownerId) === session.user.id;
      if (!allowed) {
        const member = await getMembership(session.user.id);
        allowed = !!member && can(member.role, "manageBookings") &&
          (await getBusinessRentals(session.user.id)).some(r => r._id.equals(rental._id));
      }
    }
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (booking.status === "CANCELLED") return NextResponse.json({ error: "This booking was cancelled" }, { status: 400 });

    const { plateNumber, cnic } = await req.json().catch(() => ({}));
    const plate = normalizePlate(plateNumber);
    if (!plate) return NextResponse.json({ error: "Enter the number plate, e.g. LEA-1234" }, { status: 400 });
    const renterCnic = normalizeCnic(cnic);
    if (!renterCnic) return NextResponse.json({ error: "Enter the renter's 13-digit CNIC, e.g. 35202-1234567-1" }, { status: 400 });

    booking.plateNumber = plate;
    booking.renterCnic = renterCnic;
    await booking.save();
    if (rentalId) await Rental.updateOne({ _id: rentalId }, { $set: { plateNumber: plate } });
    return NextResponse.json({ plateNumber: plate, renterCnic });
  } catch (error) {
    console.error("Booking handover details error:", error);
    return NextResponse.json({ error: "Failed to save the handover details" }, { status: 500 });
  }
}
