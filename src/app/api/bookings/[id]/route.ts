import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking";
import { Rental } from "@/models/Rental";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";
import { auth } from "@/lib/auth";
import { sendBookingConfirmedEmail } from "@/lib/email";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    await connectDB();
    const { status } = await req.json();
    const booking = await Booking.findById(id).populate("rentalId");
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    const rental = booking.rentalId as {
      ownerId: { toString: () => string };
      listingId: { toString: () => string };
    };
    const isOwner = rental.ownerId.toString() === session.user.id;
    const isRenter = booking.renterId.toString() === session.user.id;
    if (!isOwner && !isRenter) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isRenter && status !== "CANCELLED") {
      return NextResponse.json({ error: "Renters can only cancel" }, { status: 403 });
    }
    booking.status = status;
    if (isOwner && (status === "CONFIRMED" || status === "CANCELLED")) {
      booking.seenByRenter = false;
    }
    await booking.save();

    if (isOwner && (status === "CONFIRMED" || status === "CANCELLED")) {
      try {
        const listing = await Listing.findById(rental.listingId).lean() as { title: string } | null;
        const renter = await User.findById(booking.renterId).lean() as { name?: string; email: string } | null;
        const owner = await User.findById(session.user.id).lean() as { phone?: string } | null;
        if (renter && listing) {
          await sendBookingConfirmedEmail({
            renterEmail: renter.email,
            renterName: renter.name ?? "Renter",
            listingTitle: listing.title,
            startDate: booking.startDate.toISOString(),
            endDate: booking.endDate.toISOString(),
            ownerPhone: owner?.phone,
            status: status as "CONFIRMED" | "CANCELLED",
          });
        }
      } catch (e) {
        console.error("Email failed:", e);
      }
    }
    return NextResponse.json({ booking });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    await connectDB();
    const booking = await Booking.findById(id).populate("rentalId");
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const rental = booking.rentalId as { ownerId: { toString: () => string } };
    const isOwner = rental.ownerId.toString() === session.user.id;
    const isRenter = booking.renterId.toString() === session.user.id;

    if (!isOwner && !isRenter) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!["COMPLETED", "CANCELLED"].includes(booking.status)) {
      return NextResponse.json({ error: "Only completed or cancelled bookings can be deleted" }, { status: 400 });
    }

    if (isOwner) booking.deletedByOwner = true;
    if (isRenter) booking.deletedByRenter = true;

    if (booking.deletedByOwner && booking.deletedByRenter) {
      await Booking.findByIdAndDelete(id);
    } else {
      await booking.save();
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 });
  }
}
