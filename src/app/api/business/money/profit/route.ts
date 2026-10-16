import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { LedgerEntry } from "@/models/LedgerEntry";
import { Listing } from "@/models/Listing";
import { Purchase } from "@/models/Purchase";
import { Rental } from "@/models/Rental";
import { Booking } from "@/models/Booking";
import { getOrgUserIds } from "@/lib/business";
import { moneyGate } from "@/lib/moneyAccess";
import { salePrice } from "@/lib/purchases";

type Oid = mongoose.Types.ObjectId;

/**
 * Profit per vehicle: what it earned (its completed sale price plus completed rental income, including late fees)
 * minus the expenses linked to it. Vehicles with neither are left out.
 */
export async function GET() {
  try {
    const g = await moneyGate();
    if ("error" in g) return g.error;
    const org = g.member.organizationId;
    const memberIds = await getOrgUserIds(org);
    const listings = await Listing.find({ sellerId: { $in: memberIds } }).select("title status type images price").lean<Array<{ _id: Oid; title: string; status: string; type: string; images?: string[]; price: number }>>();
    const ids = listings.map(l => l._id);

    const [costs, sales, rentals] = await Promise.all([
      LedgerEntry.aggregate<{ _id: Oid; total: number; purchase: number }>([
        { $match: { organizationId: org, type: "OUT", listingId: { $in: ids } } },
        { $group: { _id: "$listingId", total: { $sum: "$amount" }, purchase: { $sum: { $cond: [{ $eq: ["$category", "VEHICLE_PURCHASE"] }, "$amount", 0] } } } },
      ]),
      Purchase.find({ organizationId: org, status: "COMPLETED", listingId: { $in: ids } }).select("listingId askingPrice offerPrice agreedPrice").lean<Array<{ listingId: Oid; askingPrice: number; offerPrice?: number; agreedPrice?: number }>>(),
      Rental.find({ listingId: { $in: ids } }).select("_id listingId").lean<Array<{ _id: Oid; listingId: Oid }>>(),
    ]);
    const rentalToListing = new Map(rentals.map(r => [String(r._id), String(r.listingId)]));
    const rentIncome = await Booking.aggregate<{ _id: Oid; total: number; n: number }>([
      { $match: { rentalId: { $in: rentals.map(r => r._id) }, status: "COMPLETED" } },
      { $group: { _id: "$rentalId", total: { $sum: { $add: ["$totalAmount", { $ifNull: ["$lateFee", 0] }, { $ifNull: ["$extraCharges", 0] }] } }, n: { $sum: 1 } } },
    ]);

    const byListing = new Map<string, { cost: number; purchase: number; sale: number; rent: number; rentals: number }>();
    const row = (id: string) => byListing.get(id) ?? byListing.set(id, { cost: 0, purchase: 0, sale: 0, rent: 0, rentals: 0 }).get(id)!;
    costs.forEach(c => { const r = row(String(c._id)); r.cost += c.total; r.purchase += c.purchase; });
    sales.forEach(s => { row(String(s.listingId)).sale += salePrice(s); });
    rentIncome.forEach(b => { const lid = rentalToListing.get(String(b._id)); if (lid) { const r = row(lid); r.rent += b.total; r.rentals += b.n; } });

    const vehicles = listings
      .filter(l => byListing.has(String(l._id)))
      .map(l => {
        const r = byListing.get(String(l._id))!;
        const income = r.sale + r.rent;
        return { id: String(l._id), title: l.title, status: l.status, image: l.images?.[0], purchase: r.purchase, otherCosts: r.cost - r.purchase, costs: r.cost, sale: r.sale, rent: r.rent, rentals: r.rentals, income, profit: income - r.cost };
      })
      .sort((a, b) => b.profit - a.profit);
    const totals = vehicles.reduce((t, v) => ({ costs: t.costs + v.costs, income: t.income + v.income, profit: t.profit + v.profit }), { costs: 0, income: 0, profit: 0 });
    return NextResponse.json({ vehicles, totals });
  } catch (error) {
    console.error("Money profit GET error:", error);
    return NextResponse.json({ error: "Failed to load profit" }, { status: 500 });
  }
}
