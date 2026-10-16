import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { LedgerEntry } from "@/models/LedgerEntry";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";
import { getOrgUserIds } from "@/lib/business";
import { MANUAL_IN, MANUAL_OUT, MONEY_LABEL, pkRange } from "@/lib/money";
import { moneyGate } from "@/lib/moneyAccess";
import { logBusinessAction } from "@/lib/businessLog";

type Oid = mongoose.Types.ObjectId;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Money entries between `from` and `to` (Pakistan-time days, inclusive), optionally only expenses (`kind=expenses`)
 * or one vehicle (`listing=<id>`), with totals and the cash balance before `from`. Also returns the business's
 * vehicles for the expense form.
 */
export async function GET(req: NextRequest) {
  try {
    const g = await moneyGate();
    if ("error" in g) return g.error;
    const sp = req.nextUrl.searchParams;
    const fromKey = sp.get("from") ?? "";
    const toKey = sp.get("to") ?? fromKey;
    if (!DAY_RE.test(fromKey) || !DAY_RE.test(toKey)) return NextResponse.json({ error: "Choose dates" }, { status: 400 });
    const from = pkRange(fromKey).from;
    const to = pkRange(toKey).to;

    const filter: Record<string, unknown> = { organizationId: g.member.organizationId, date: { $gte: from, $lt: to } };
    if (sp.get("kind") === "expenses") filter.type = "OUT";
    const listing = sp.get("listing");
    if (listing && mongoose.Types.ObjectId.isValid(listing)) filter.listingId = new mongoose.Types.ObjectId(listing);

    const [entries, before, memberIds] = await Promise.all([
      LedgerEntry.find(filter).sort({ date: -1, createdAt: -1 }).limit(1000).lean<Array<{ type: string; amount: number; createdBy: Oid; listingId?: Oid }>>(),
      LedgerEntry.aggregate<{ _id: string; total: number }>([
        { $match: { organizationId: g.member.organizationId, date: { $lt: from } } },
        { $group: { _id: "$type", total: { $sum: "$amount" } } },
      ]),
      getOrgUserIds(g.member.organizationId),
    ]);
    const vehicles = await Listing.find({ sellerId: { $in: memberIds } }).select("title status").sort({ createdAt: -1 }).limit(300)
      .lean<Array<{ _id: Oid; title: string; status: string }>>();
    const users = await User.find({ _id: { $in: [...new Set(entries.map(e => String(e.createdBy)))] } }).select("name email").lean<Array<{ _id: Oid; name?: string; email: string }>>();
    const nameOf = new Map(users.map(u => [String(u._id), u.name || u.email]));
    const titleOf = new Map(vehicles.map(v => [String(v._id), v.title]));

    const totalIn = entries.filter(e => e.type === "IN").reduce((n, e) => n + e.amount, 0);
    const totalOut = entries.filter(e => e.type === "OUT").reduce((n, e) => n + e.amount, 0);
    const opening = (before.find(b => b._id === "IN")?.total ?? 0) - (before.find(b => b._id === "OUT")?.total ?? 0);

    return NextResponse.json({
      entries: entries.map(e => ({ ...e, createdByName: nameOf.get(String(e.createdBy)), vehicleTitle: e.listingId ? titleOf.get(String(e.listingId)) : undefined })),
      totals: { in: totalIn, out: totalOut, opening, closing: opening + totalIn - totalOut },
      vehicles: vehicles.map(v => ({ id: String(v._id), title: v.title, status: v.status })),
    });
  } catch (error) {
    console.error("Money entries GET error:", error);
    return NextResponse.json({ error: "Failed to load money" }, { status: 500 });
  }
}

/** Adds an entry by hand. Body: { type, category, amount, date: "YYYY-MM-DD", note?, listingId?, vehicleLabel? }. */
export async function POST(req: NextRequest) {
  try {
    const g = await moneyGate();
    if ("error" in g) return g.error;
    const b = await req.json().catch(() => ({}));
    const type = b.type === "IN" ? "IN" : b.type === "OUT" ? "OUT" : null;
    if (!type) return NextResponse.json({ error: "Choose money in or money out" }, { status: 400 });
    const allowed = (type === "OUT" ? MANUAL_OUT : MANUAL_IN).map(c => c.id as string);
    if (!allowed.includes(b.category)) return NextResponse.json({ error: "Choose a category" }, { status: 400 });
    const amount = Math.round(Number(b.amount));
    if (!Number.isFinite(amount) || amount < 1 || amount > 1e10) return NextResponse.json({ error: "Enter the amount in PKR" }, { status: 400 });
    if (typeof b.date !== "string" || !DAY_RE.test(b.date)) return NextResponse.json({ error: "Choose the date" }, { status: 400 });
    // Stored at midday Pakistan time on the chosen day
    const date = new Date(pkRange(b.date).from.getTime() + 12 * 60 * 60 * 1000);
    if (date.getTime() > Date.now() + 36 * 60 * 60 * 1000) return NextResponse.json({ error: "The date can't be in the future" }, { status: 400 });

    let listingId: Oid | undefined;
    let vehicleLabel: string | undefined;
    if (type === "OUT" && b.listingId) {
      if (!mongoose.Types.ObjectId.isValid(String(b.listingId))) return NextResponse.json({ error: "Vehicle not found" }, { status: 400 });
      const memberIds = await getOrgUserIds(g.member.organizationId);
      const l = await Listing.findOne({ _id: b.listingId, sellerId: { $in: memberIds } }).select("title").lean<{ _id: Oid; title: string }>();
      if (!l) return NextResponse.json({ error: "That vehicle isn't in your inventory" }, { status: 400 });
      listingId = l._id;
    } else if (type === "OUT" && typeof b.vehicleLabel === "string" && b.vehicleLabel.trim()) {
      vehicleLabel = b.vehicleLabel.trim().slice(0, 120);
    }
    const note = typeof b.note === "string" ? b.note.trim().slice(0, 300) || undefined : undefined;

    const entry = await LedgerEntry.create({ organizationId: g.member.organizationId, type, category: b.category, amount, date, note, listingId, vehicleLabel, source: "MANUAL", createdBy: g.userId });
    await logBusinessAction({ userId: g.userId, organizationId: g.member.organizationId }, type === "OUT" ? "money.expense" : "money.cash",
      { type: "MONEY", id: entry._id, label: MONEY_LABEL[b.category] }, { details: [note, vehicleLabel].filter(Boolean).join(" · ") || undefined, amount: type === "OUT" ? -amount : amount });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Money entries POST error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
