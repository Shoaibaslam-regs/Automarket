import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { loadOwnedBooking } from "@/lib/bookingAccess";
import { depositState, DEPOSIT_LABEL } from "@/lib/checklist";
import { logBusinessAction } from "@/lib/businessLog";
import { bookingNumber } from "@/lib/bookings";
import { recordPaymentChange, recordOut } from "@/lib/ledger";
import { getMembership } from "@/lib/business";

/**
 * Settles the security deposit after the vehicle is back. Body: { refunded, note? }.
 * `refunded` is what went back to the renter (0 to the deposit); the rest is kept, and keeping any needs a reason.
 * It can be corrected later; business cash books record the difference.
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
    if (!booking.deposit) return NextResponse.json({ error: "This booking has no deposit" }, { status: 400 });
    if (!["COMPLETED", "CANCELLED"].includes(booking.status)) {
      return NextResponse.json({ error: "Settle the deposit once the vehicle is back" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const refunded = Math.round(Number(body.refunded));
    if (!Number.isFinite(refunded) || refunded < 0 || refunded > booking.deposit) {
      return NextResponse.json({ error: `Enter an amount from 0 to PKR ${booking.deposit.toLocaleString()}` }, { status: 400 });
    }
    const note = String(body.note ?? "").trim().slice(0, 300);
    if (refunded < booking.deposit && !note) return NextResponse.json({ error: "Say why part of the deposit is kept, e.g. scratch on the bumper" }, { status: 400 });

    const before = booking.depositSettledAt ? depositState(booking).refunded : 0;
    booking.depositRefunded = refunded;
    booking.depositNote = note || undefined;
    booking.depositSettledAt = new Date();
    await booking.save();

    // Cash book: a refund is money out; lowering an earlier refund puts it back in
    const change = refunded - before;
    const ref = bookingNumber(String(booking._id));
    if (change > 0) {
      const member = await getMembership(session.user.id);
      if (member) await recordOut(session.user.id, member.organizationId, "DEPOSIT_REFUND", change, { bookingId: booking._id }, ref);
    } else if (change < 0) {
      await recordPaymentChange(session.user.id, -change, "BOOKING_PAYMENT", { bookingId: booking._id }, `${ref} deposit refund corrected`);
    }

    const state = depositState(booking);
    await logBusinessAction({ userId: session.user.id }, "booking.deposit",
      { type: "BOOKING", id: booking._id, label: ref },
      { details: `${DEPOSIT_LABEL[state.status]}: PKR ${state.refunded.toLocaleString()} back${state.kept ? `, PKR ${state.kept.toLocaleString()} kept (${note})` : ""}`, amount: -change });
    return NextResponse.json({ depositRefunded: refunded, depositNote: booking.depositNote ?? null, depositSettledAt: booking.depositSettledAt, deposit: state });
  } catch (error) {
    console.error("Booking deposit error:", error);
    return NextResponse.json({ error: "Failed to save the deposit" }, { status: 500 });
  }
}
