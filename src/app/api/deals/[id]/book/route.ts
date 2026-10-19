import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking";
import { Deal } from "@/models/Deal";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { getOrgUserIds } from "@/lib/business";
import { bookingClashQuery, rentalDays, validBookingDates } from "@/lib/bookings";
import { dealPrice, dealState } from "@/lib/deals";
import { ensureBookingCustomer } from "@/lib/customerSync";
import { sendBookingRequestEmail } from "@/lib/email";
import { rateLimitResponse } from "@/lib/rateLimit";
import { notifyTeam } from "@/lib/teamNotify";

/**
 * Books a rent deal (a single car or a multi-car package) for the signed-in user. Body: { startDate, endDate }.
 * The booking goes through the business's normal flow (confirm, hand over, return) and carries the deal as its tag.
 * The pickup date must fall while the deal runs, and the package can't be booked twice for overlapping dates.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Sign in to book this deal" }, { status: 401 });
    const limited = await rateLimitResponse("bookings", session.user.id, "booking requests");
    if (limited) return limited;
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    await connectDB();

    const deal = await Deal.findById(id).lean<{
      _id: mongoose.Types.ObjectId; organizationId: mongoose.Types.ObjectId; title: string; dealType?: string;
      price: number; discountType: "PERCENT" | "AMOUNT"; discountValue: number; deposit?: number;
      startsAt: Date; endsAt: Date; paused: boolean; disabledByAdmin: boolean;
    }>();
    if (!deal || deal.dealType !== "RENT") return NextResponse.json({ error: "This deal can't be booked" }, { status: 404 });
    if (dealState(deal) !== "LIVE") return NextResponse.json({ error: "This deal isn't running right now" }, { status: 400 });
    const org = await Organization.findOne({ _id: deal.organizationId, isActive: { $ne: false } }).select("name ownerId").lean<{ _id: mongoose.Types.ObjectId; name: string; ownerId: mongoose.Types.ObjectId }>();
    if (!org) return NextResponse.json({ error: "This business isn't taking bookings right now" }, { status: 400 });
    if ((await getOrgUserIds(org._id)).some(m => String(m) === session.user.id)) {
      return NextResponse.json({ error: "You can't book your own business's deal" }, { status: 400 });
    }

    const { startDate, endDate } = await req.json().catch(() => ({}));
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return NextResponse.json({ error: "Choose pickup and return dates" }, { status: 400 });
    if (!validBookingDates(start, end)) return NextResponse.json({ error: "The return date can't be before the pickup date" }, { status: 400 });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) return NextResponse.json({ error: "Pickup can't be in the past" }, { status: 400 });
    if (start > new Date(deal.endsAt)) {
      return NextResponse.json({ error: `Pickup must be on or before ${new Date(deal.endsAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}, when the deal ends` }, { status: 400 });
    }

    const conflict = await Booking.exists({
      dealId: deal._id,
      status: { $in: ["PENDING", "CONFIRMED", "ACTIVE"] },
      ...bookingClashQuery(start, end),
    });
    if (conflict) return NextResponse.json({ error: "This deal is already booked for some of those dates. Try other dates." }, { status: 409 });

    const days = rentalDays(start, end);
    const totalAmount = days * dealPrice(deal.price, deal);
    const deposit = deal.deposit ?? 0;
    const booking = await Booking.create({
      dealId: deal._id,
      renterId: session.user.id,
      startDate: start,
      endDate: end,
      totalAmount,
      deposit,
      status: "PENDING",
    });

    // Same follow-up as a normal rental booking: CRM customer, live badge, email to the owner
    try {
      await ensureBookingCustomer(booking._id);
    } catch (e) {
      console.error("Adding deal booking customer failed:", e);
    }
    try {
      // Everyone in the business who handles bookings gets a badge and a phone alert
      await notifyTeam(org._id, "manageBookings", { type: "booking", status: "PENDING" });
      const [owner, renter] = await Promise.all([
        User.findById(org.ownerId).select("name email").lean<{ name?: string; email: string }>(),
        User.findById(session.user.id).select("name email phone").lean<{ name?: string; email: string; phone?: string }>(),
      ]);
      if (owner && renter) {
        await sendBookingRequestEmail({
          ownerEmail: owner.email,
          ownerName: owner.name ?? org.name,
          renterName: renter.name ?? "A user",
          renterEmail: renter.email,
          renterPhone: renter.phone,
          listingTitle: `Deal: ${deal.title}`,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          totalAmount,
          deposit,
          days,
          bookingId: booking._id.toString(),
        });
      }
    } catch (e) {
      console.error("Deal booking notification failed:", e);
    }

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error("Deal booking error:", error);
    return NextResponse.json({ error: "Failed to book this deal" }, { status: 500 });
  }
}
