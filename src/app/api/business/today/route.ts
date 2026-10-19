import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getMembership } from "@/lib/business";
import { businessBookingQuery } from "@/lib/dealBookings";
import { Booking } from "@/models/Booking";
import { Purchase } from "@/models/Purchase";
import { FollowUp } from "@/models/FollowUp";
import { bookingNumber } from "@/lib/bookings";
import { purchaseNumber } from "@/lib/purchases";
import { pkDay, pkRange } from "@/lib/money";
import type { TodayItem } from "@/lib/today";

type BookingRow = {
  _id: unknown; status: string; startDate: Date; endDate: Date; dueBackAt?: Date; completedAt?: Date; deposit: number;
  walkIn?: { name: string }; renterId?: { name?: string } | null; offListVehicle?: { title: string } | null;
  dealId?: { title: string } | null; rentalId?: { listingId?: { title: string } | null } | null;
};

/**
 * Everything that needs doing today for the whole business, overdue first: booking requests, pickups, returns,
 * deposits to settle, purchase requests, installments and follow-ups. Each item links to the page that handles it.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });

    const { from: todayStart, to: todayEnd } = pkRange(pkDay());
    const { query } = await businessBookingQuery(session.user.id, member.organizationId);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [bookings, sales, plans, followUps] = await Promise.all([
      Booking.find({
        ...query,
        deletedByOwner: { $ne: true },
        $and: [{ $or: [
          { status: "PENDING" },
          { status: "CONFIRMED", startDate: { $lt: todayEnd } },
          { status: "ACTIVE" },
          { status: "COMPLETED", deposit: { $gt: 0 }, depositSettledAt: { $exists: false }, completedAt: { $gte: monthAgo } },
        ] }],
      })
        .select("status startDate endDate dueBackAt completedAt deposit walkIn renterId offListVehicle dealId rentalId")
        .populate("renterId", "name")
        .populate("dealId", "title")
        .populate({ path: "rentalId", select: "listingId", populate: { path: "listingId", select: "title" } })
        .limit(200)
        .lean<BookingRow[]>(),
      Purchase.find({ organizationId: member.organizationId, status: "REQUESTED" }).select("vehicle buyer createdAt").limit(50)
        .lean<Array<{ _id: unknown; vehicle: { title: string }; buyer: { name: string }; createdAt: Date }>>(),
      Purchase.find({ organizationId: member.organizationId, deletedByBusiness: { $ne: true }, "installmentPlan.items": { $elemMatch: { paidAt: { $exists: false }, dueDate: { $lt: todayEnd } } } })
        .select("vehicle buyer installmentPlan").limit(50)
        .lean<Array<{ _id: unknown; vehicle: { title: string }; buyer: { name: string }; installmentPlan: { items: { dueDate: Date; amount: number; paidAt?: Date }[] } }>>(),
      FollowUp.find({ organizationId: member.organizationId, doneAt: { $exists: false }, dueAt: { $lt: todayEnd } }).sort({ dueAt: 1 }).limit(50)
        .lean<Array<{ _id: unknown; customerName: string; note: string; dueAt: Date }>>(),
    ]);

    const items: TodayItem[] = [];
    const vehicle = (b: BookingRow) => b.dealId?.title ?? b.rentalId?.listingId?.title ?? b.offListVehicle?.title ?? "Vehicle";
    const who = (b: BookingRow) => b.walkIn?.name ?? b.renterId?.name ?? "Customer";
    for (const b of bookings) {
      const ref = bookingNumber(String(b._id));
      const href = `/business/bookings?q=${ref}`;
      const sub = `${who(b)} · ${vehicle(b)}`;
      if (b.status === "PENDING") items.push({ kind: "bookingRequest", id: String(b._id), title: "New booking request", subtitle: sub, at: b.startDate.toISOString(), overdue: false, href, action: "Confirm" });
      else if (b.status === "CONFIRMED") items.push({ kind: "pickup", id: String(b._id), title: b.startDate < todayStart ? "Pickup was due" : "Pickup today", subtitle: sub, at: b.startDate.toISOString(), overdue: b.startDate < todayStart, href, action: "Hand over" });
      else if (b.status === "ACTIVE") {
        const due = b.dueBackAt ?? b.endDate;
        if (due < todayEnd) items.push({ kind: "return", id: String(b._id), title: due.getTime() < Date.now() ? "Return overdue" : "Return due today", subtitle: sub, at: due.toISOString(), overdue: due.getTime() < Date.now(), href, action: "Mark returned" });
      } else if (b.status === "COMPLETED") items.push({ kind: "deposit", id: String(b._id), title: "Deposit to settle", subtitle: `${sub} · PKR ${b.deposit.toLocaleString()}`, at: (b.completedAt ?? b.endDate).toISOString(), overdue: false, href, action: "Settle" });
    }
    for (const s of sales) items.push({ kind: "saleRequest", id: String(s._id), title: "New purchase request", subtitle: `${s.buyer.name} · ${s.vehicle.title}`, at: s.createdAt.toISOString(), overdue: false, href: `/business/sales?q=${purchaseNumber(String(s._id))}`, action: "Review" });
    for (const p of plans) {
      const due = p.installmentPlan.items.filter(i => !i.paidAt && i.dueDate < todayEnd);
      const first = due[0];
      items.push({
        kind: "installment", id: String(p._id), title: due.length > 1 ? `${due.length} installments due` : first.dueDate < todayStart ? "Installment overdue" : "Installment due today",
        subtitle: `${p.buyer.name} · ${p.vehicle.title} · PKR ${due.reduce((n, i) => n + i.amount, 0).toLocaleString()}`,
        at: first.dueDate.toISOString(), overdue: first.dueDate < todayStart, href: `/business/sales?q=${purchaseNumber(String(p._id))}`, action: "Open",
      });
    }
    for (const f of followUps) items.push({ kind: "followUp", id: String(f._id), title: f.dueAt < todayStart ? "Follow-up overdue" : "Follow up today", subtitle: `${f.customerName} · ${f.note}`, at: f.dueAt.toISOString(), overdue: f.dueAt < todayStart, href: "/business/customers", action: "Open" });

    items.sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.at.localeCompare(b.at));
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Business today GET error:", error);
    return NextResponse.json({ error: "Failed to load today's tasks" }, { status: 500 });
  }
}
