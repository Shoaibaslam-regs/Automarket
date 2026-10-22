import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { loadOwnedBooking } from "@/lib/bookingAccess";
import { amountDue, paymentState } from "@/lib/payments";
import { logBusinessAction } from "@/lib/businessLog";
import { bookingNumber } from "@/lib/bookings";
import { moneyTransaction, recordPaymentChange } from "@/lib/ledger";
import { Booking } from "@/models/Booking";
import { reportError } from "@/lib/errorLog";

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

    // Set atomically and read the previous amount in the same step, so two people saving at once can't
    // both count the same money in the cash book; the entry is in the same transaction as the payment
    const now = new Date();
    const userId = session.user.id;
    const before = await moneyTransaction(async dbSession => {
      const prev = await Booking.findOneAndUpdate({ _id: booking._id }, { $set: { amountPaid: paid, paymentUpdatedAt: now } }, { session: dbSession, projection: { amountPaid: 1 } })
        .lean<{ amountPaid?: number }>();
      const was = prev?.amountPaid ?? 0;
      await recordPaymentChange(userId, paid - was, "BOOKING_PAYMENT", { bookingId: booking._id }, bookingNumber(String(booking._id)), { session: dbSession });
      return was;
    });
    booking.amountPaid = paid;
    booking.paymentUpdatedAt = now;
    await logBusinessAction({ userId: session.user.id }, "booking.payment",
      { type: "BOOKING", id: booking._id, label: bookingNumber(String(booking._id)) },
      { details: `PKR ${before.toLocaleString()} → PKR ${paid.toLocaleString()} of ${due.toLocaleString()}`, amount: paid - before });
    return NextResponse.json({ amountPaid: paid, payment: paymentState(booking) });
  } catch (error) {
    reportError("Booking payment error:", error);
    return NextResponse.json({ error: "Failed to save the payment" }, { status: 500 });
  }
}
