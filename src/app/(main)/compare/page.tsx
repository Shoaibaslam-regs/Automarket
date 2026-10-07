import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import mongoose from "mongoose";
import { Car, Trophy } from "lucide-react";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { Rental } from "@/models/Rental";
import { Inspection } from "@/models/Inspection";
import { getSellerRatings } from "@/lib/reviews";
import { formatLakh } from "@/lib/format";
import { MAX_COMPARE } from "@/lib/compare";
import StarRating from "@/components/reviews/StarRating";
import CompareRemoveButton from "@/components/listings/CompareRemoveButton";

export const metadata: Metadata = { title: "Compare vehicles", robots: { index: false } };

type CompareListing = {
  _id: mongoose.Types.ObjectId;
  title: string; make: string; model: string; year: number; price: number; type: string;
  condition: string; location: string; images: string[]; status: string;
  mileage?: number; fuelType?: string; transmission?: string; color?: string;
  sellerId?: { _id: mongoose.Types.ObjectId; name?: string } | null;
};

const CONDITION_RANK: Record<string, number> = { NEW: 5, EXCELLENT: 4, GOOD: 3, FAIR: 2, POOR: 1 };
const TYPE_LABELS: Record<string, string> = { SALE: "For sale", RENT: "For rent", BOTH: "Sale & rent" };

type Row = {
  label: string;
  values: React.ReactNode[];
  /** Numeric score per column; the highest gets the "best" highlight (when they differ). */
  scores?: (number | undefined)[];
};

function bestIndexes(scores: (number | undefined)[] | undefined): Set<number> {
  if (!scores) return new Set();
  const defined = scores.filter((s): s is number => s !== undefined);
  if (defined.length < 2) return new Set();
  const max = Math.max(...defined);
  if (defined.every(s => s === max)) return new Set();
  return new Set(scores.flatMap((s, i) => (s === max ? [i] : [])));
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids: raw = "" } = await searchParams;
  const ids = [...new Set(raw.split(","))].filter(id => mongoose.Types.ObjectId.isValid(id)).slice(0, MAX_COMPARE);

  await connectDB();
  const docs = ids.length
    ? await Listing.find({ _id: { $in: ids } }).populate("sellerId", "name").lean<CompareListing[]>()
    : [];
  const byId = new Map(docs.map(d => [String(d._id), d]));
  const listings = ids.map(id => byId.get(id)).filter((l): l is CompareListing => !!l);

  if (listings.length < 2) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Car size={26} strokeWidth={1.6} />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Pick at least two vehicles</h1>
          <p className="mt-1 text-sm text-slate-500">
            Use the compare button on any listing to add up to {MAX_COMPARE} vehicles, then compare them side by side here.
          </p>
          <Link href="/listings" className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
            Browse vehicles
          </Link>
        </div>
      </div>
    );
  }

  const listingIds = listings.map(l => l._id);
  const sellerIds = listings.flatMap(l => (l.sellerId?._id ? [String(l.sellerId._id)] : []));
  const [rentals, inspections, ratings] = await Promise.all([
    Rental.find({ listingId: { $in: listingIds } }).lean<{ listingId: mongoose.Types.ObjectId; dailyRate: number; deposit: number }[]>(),
    Inspection.find({ listingId: { $in: listingIds } }).lean<{ listingId: mongoose.Types.ObjectId; damageScore?: number; estimate?: number }[]>(),
    getSellerRatings(sellerIds),
  ]);
  const rentalOf = new Map(rentals.map(r => [String(r.listingId), r]));
  const inspectionOf = new Map(inspections.map(i => [String(i.listingId), i]));

  const cols = listings.map(l => {
    const id = String(l._id);
    // Rent-only listings store the daily rate as their price
    const dailyRate = l.type === "RENT" ? l.price : rentalOf.get(id)?.dailyRate;
    const salePrice = l.type === "RENT" ? undefined : l.price;
    return { l, id, dailyRate, salePrice, inspection: inspectionOf.get(id), rating: l.sellerId?._id ? ratings.get(String(l.sellerId._id)) : undefined };
  });

  const dash = <span className="text-slate-300">—</span>;
  const rows: Row[] = [
    {
      label: "Sale price",
      values: cols.map(c => (c.salePrice ? <span key={c.id} className="font-bold text-slate-900">PKR {formatLakh(c.salePrice)}</span> : dash)),
      scores: cols.map(c => (c.salePrice ? -c.salePrice : undefined)),
    },
    {
      label: "Daily rent",
      values: cols.map(c => (c.dailyRate ? `PKR ${c.dailyRate.toLocaleString("en-PK")}/day` : dash)),
      scores: cols.map(c => (c.dailyRate ? -c.dailyRate : undefined)),
    },
    { label: "Listing type", values: cols.map(c => TYPE_LABELS[c.l.type] ?? c.l.type) },
    { label: "Model year", values: cols.map(c => c.l.year), scores: cols.map(c => c.l.year) },
    {
      label: "Mileage",
      values: cols.map(c => (c.l.mileage != null ? `${c.l.mileage.toLocaleString("en-PK")} km` : dash)),
      scores: cols.map(c => (c.l.mileage != null ? -c.l.mileage : undefined)),
    },
    {
      label: "Condition",
      values: cols.map(c => <span key={c.id} className="capitalize">{c.l.condition.toLowerCase()}</span>),
      scores: cols.map(c => CONDITION_RANK[c.l.condition]),
    },
    { label: "Fuel type", values: cols.map(c => c.l.fuelType || dash) },
    { label: "Transmission", values: cols.map(c => c.l.transmission || dash) },
    { label: "Colour", values: cols.map(c => c.l.color || dash) },
    { label: "Location", values: cols.map(c => c.l.location) },
    {
      label: "AI damage score",
      values: cols.map(c => (c.inspection?.damageScore != null ? `${c.inspection.damageScore}/10` : dash)),
      scores: cols.map(c => (c.inspection?.damageScore != null ? -c.inspection.damageScore : undefined)),
    },
    {
      label: "Seller rating",
      values: cols.map(c =>
        c.rating ? (
          <span key={c.id} className="inline-flex items-center gap-1.5">
            <StarRating value={c.rating.average} size={12} />
            <span className="text-xs text-slate-500">
              {c.rating.average.toFixed(1)} ({c.rating.count})
            </span>
          </span>
        ) : (
          <span key={c.id} className="text-xs text-slate-400">No reviews</span>
        )
      ),
      scores: cols.map(c => c.rating?.average),
    },
    { label: "Seller", values: cols.map(c => c.l.sellerId?.name || dash) },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">Side by side</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Compare vehicles</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          <Trophy size={14} className="text-emerald-600" /> Highlighted cells show the best value in each row.
        </p>

        <div className="mt-6 overflow-x-auto rounded-[22px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[150px] sm:w-[180px]" />
              {cols.map(c => (
                <col key={c.id} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white" />
                {cols.map(c => (
                  <th key={c.id} className="p-3 text-left align-top font-normal">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
                      {c.l.images?.[0] ? (
                        <Image src={c.l.images[0]} alt={c.l.title} fill sizes="(max-width: 768px) 220px, 330px" className="object-cover" />
                      ) : (
                        <Car size={28} className="absolute inset-0 m-auto text-slate-300" />
                      )}
                      <CompareRemoveButton id={c.id} remainingIds={cols.filter(o => o.id !== c.id).map(o => o.id)} />
                      {c.l.status !== "ACTIVE" && (
                        <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold capitalize text-white">
                          {c.l.status.toLowerCase()}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {c.l.make} · {c.l.model}
                    </p>
                    <Link href={`/listings/${c.id}`} className="mt-0.5 line-clamp-2 font-semibold text-slate-900 hover:underline">
                      {c.l.title}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const best = bestIndexes(row.scores);
                return (
                  <tr key={row.label} className="border-t border-slate-100">
                    <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-xs font-semibold text-slate-500">
                      {row.label}
                    </th>
                    {row.values.map((v, i) => (
                      <td key={cols[i].id} className={`px-3 py-3 text-slate-700 ${best.has(i) ? "bg-emerald-50/70" : ""}`}>
                        <span className="inline-flex items-center gap-1.5">
                          {v}
                          {best.has(i) && <Trophy size={12} className="flex-shrink-0 text-emerald-600" aria-label="Best" />}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr className="border-t border-slate-100">
                <th className="sticky left-0 z-10 bg-white" />
                {cols.map(c => (
                  <td key={c.id} className="p-3">
                    <Link
                      href={`/listings/${c.id}`}
                      className="block rounded-xl bg-slate-900 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      View listing
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
