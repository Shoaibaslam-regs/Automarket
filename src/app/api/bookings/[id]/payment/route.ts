import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { loadOwnedBooking } from "@/lib/bookingAccess";
import { amountDue, paymentState } from "@/lib/payments";

/**
 * Records what the renter has paid. Body: { status: "PENDING" | "PARTIAL" | "PAID", amountPaid? }.
 * PAID stores the full amount owed, PENDING stores 0, and PARTIAL needs an amount between 0 and the total.
 * Allowed for the vehicle's owner and business members who manage bookings.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();

    const found = await loadOwnedBooking(session.user.id, id);
    if (!found.booking) return NextResponse.json({ error: found.error }, { status: found.status });
    const { booking } = found;
    if (booking.status === "CANCELLED") return NextResponse.json({ error: "This booking was cancelled" }, { status: 400 });

    const { status, amountPaid } = await req.json().catch(() => ({}));
    const due = amountDue(booking);
    let paid: number;
    if (status === "PAID") paid = due;
    else if (status === "PENDING") paid = 0;
    else if (status === "PARTIAL") {
      paid = Math.round(Number(amountPaid));
      if (!Number.isFinite(paid) || paid <= 0) return NextResponse.json({ error: "Enter how much the renter has paid" }, { status: 400 });
      if (paid >= due) return NextResponse.json({ error: `That's the full amount (PKR ${due.toLocaleString()}). Choose Paid instead.` }, { status: 400 });
    } else {
      return NextResponse.json({ error: "Choose pending, partly paid or paid" }, { status: 400 });
    }

    booking.amountPaid = paid;
    booking.paymentUpdatedAt = new Date();
    await booking.save();
    return NextResponse.json({ amountPaid: paid, payment: paymentState(booking) });
  } catch (error) {
    console.error("Booking payment error:", error);
    return NextResponse.json({ error: "Failed to save the payment" }, { status: 500 });
  }
}
