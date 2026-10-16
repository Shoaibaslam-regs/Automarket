import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { BusinessLog } from "@/models/BusinessLog";
import { LedgerEntry } from "@/models/LedgerEntry";
import { Employee } from "@/models/Employee";
import { User } from "@/models/User";
import { can, getMembership } from "@/lib/business";

type Oid = mongoose.Types.ObjectId;
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Start of a calendar month in Pakistan time; `offset` -1 is last month. */
function monthStart(offset = 0) {
  const pk = new Date(Date.now() + PKT_OFFSET_MS);
  return new Date(Date.UTC(pk.getUTCFullYear(), pk.getUTCMonth() + offset, 1) - PKT_OFFSET_MS);
}

/** Which actions feed which number on the Performance tab. */
const COUNTS: Record<string, string[]> = {
  bookings: ["booking.create", "booking.confirm"],
  handovers: ["booking.handover"],
  returns: ["booking.return"],
  sales: ["sale.complete"],
  customers: ["customer.create"],
  followups: ["customer.followupDone"],
  listings: ["listing.create", "deal.create"],
};

/**
 * Per-member numbers for this month or last month (`?month=last`), from the activity log:
 * bookings, handovers, returns, vehicles sold and their value, customers, follow-ups, listings.
 * Payments collected come from the cash book's automatic entries (booking and sale payments, installments,
 * down payments), less any payment corrections, by the person who recorded them.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!can(member.role, "viewPerformance")) return NextResponse.json({ error: "Only the owner or a manager can see team performance" }, { status: 403 });

    const last = req.nextUrl.searchParams.get("month") === "last";
    const from = monthStart(last ? -1 : 0);
    const to = monthStart(last ? 0 : 1);

    const [rows, team, money] = await Promise.all([
      BusinessLog.aggregate<{ _id: { user: Oid; action: string }; n: number; amount: number }>([
        { $match: { organizationId: member.organizationId, createdAt: { $gte: from, $lt: to } } },
        { $group: { _id: { user: "$userId", action: "$action" }, n: { $sum: 1 }, amount: { $sum: { $ifNull: ["$amount", 0] } } } },
      ]),
      Employee.find({ organizationId: member.organizationId }).select("userId role").lean<Array<{ userId: Oid; role: string }>>(),
      LedgerEntry.aggregate<{ _id: Oid; total: number }>([
        { $match: { organizationId: member.organizationId, source: "AUTO", date: { $gte: from, $lt: to }, category: { $in: ["BOOKING_PAYMENT", "SALE_PAYMENT", "INSTALLMENT", "PAYMENT_CORRECTION"] } } },
        { $group: { _id: "$createdBy", total: { $sum: { $cond: [{ $eq: ["$type", "IN"] }, "$amount", { $multiply: ["$amount", -1] }] } } } },
      ]),
    ]);
    const collectedBy = new Map(money.map(m => [String(m._id), m.total]));
    const users = await User.find({ _id: { $in: team.map(t => t.userId) } }).select("name email image").lean<Array<{ _id: Oid; name?: string; email: string; image?: string }>>();
    const userById = new Map(users.map(u => [String(u._id), u]));

    const people = team.map(t => {
      const mine = rows.filter(r => String(r._id.user) === String(t.userId));
      const count = (actions: string[]) => mine.filter(r => actions.includes(r._id.action)).reduce((n, r) => n + r.n, 0);
      const sum = (actions: string[]) => mine.filter(r => actions.includes(r._id.action)).reduce((n, r) => n + r.amount, 0);
      const u = userById.get(String(t.userId));
      return {
        userId: String(t.userId),
        name: u?.name || u?.email || "Team member",
        image: u?.image,
        role: t.role,
        ...Object.fromEntries(Object.entries(COUNTS).map(([k, actions]) => [k, count(actions)])),
        salesValue: sum(["sale.complete"]),
        collected: Math.max(0, collectedBy.get(String(t.userId)) ?? 0),
        actions: mine.reduce((n, r) => n + r.n, 0),
      };
    }).sort((a, b) => b.actions - a.actions);

    return NextResponse.json({ from, to, people });
  } catch (error) {
    console.error("Business performance GET error:", error);
    return NextResponse.json({ error: "Failed to load performance" }, { status: 500 });
  }
}
