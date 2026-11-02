import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/mongodb";
import { FuelPrice } from "@/models/FuelPrice";
import { FuelPriceUpdate } from "@/models/FuelPriceUpdate";
import { OilMarketPrice } from "@/models/OilMarketPrice";
import { OilPriceHistory } from "@/models/OilPriceHistory";
import { getFuelStatus, type FuelStatus } from "@/lib/fuelJobs";
import { FUEL_TAG } from "@/lib/pageCache";
import { pkDayKey, priceChange, type Commodity, type FuelType } from "@/lib/fuelPrices";

// What the fuel pages show, read from MongoDB only (never from the outside sources while someone waits): approved
// Pakistani prices and the last saved Brent / WTI quotes. Public reads are cached for everyone (FUEL_TAG, cleared by
// invalidateFuel on every approval, manual entry and oil update), so the pages add no database load per visitor.

const REVALIDATE = 300;

export type PkPrice = { price: number; effectiveDate: string; previous: number | null; diff: number | null; pct: number | null; source: string; notificationUrl?: string; approvedAt: string };
export type PkDay = { date: string; petrol: number | null; diesel: number | null; notificationUrl?: string };
export type FuelNews = PkDay & { previousPetrol: number | null; previousDiesel: number | null };
export type OilQuoteView = { price: number; previousClose: number | null; change: number | null; percentChange: number | null; marketTimestamp: string; updatedAt: string; symbol: string };

export type FuelPageData = {
  pk: Partial<Record<FuelType, PkPrice>>;
  /** Approved days, oldest first, for the chart */
  pkHistory: PkDay[];
  /** The latest approved changes, newest first */
  news: FuelNews[];
  oil: Partial<Record<Commodity, OilQuoteView>>;
  /** Daily closes, oldest first, the last 30 */
  oilHistory: Record<Commodity, { date: string; price: number }[]>;
  oilUpdatedAt: string | null;
};

type PriceRow = { fuelType: FuelType; price: number; effectiveDate: Date; source: string; notificationUrl?: string; approvedAt: Date };

async function load(): Promise<FuelPageData> {
  await connectDB();
  const [rows, quotes, history, status] = await Promise.all([
    FuelPrice.find().sort({ effectiveDate: -1 }).limit(240).lean<PriceRow[]>(),
    OilMarketPrice.find().lean<(OilQuoteView & { commodity: Commodity; marketTimestamp: Date; updatedAt: Date })[]>(),
    OilPriceHistory.find({ date: { $gte: pkDayKey(new Date(Date.now() - 45 * 86_400_000)) } }).sort({ date: 1 }).lean<{ commodity: Commodity; date: string; price: number }[]>(),
    getFuelStatus(),
  ]);

  // Days with both prices, newest first
  const days = new Map<string, PkDay>();
  for (const r of rows) {
    const date = pkDayKey(new Date(r.effectiveDate));
    const day = days.get(date) ?? { date, petrol: null, diesel: null, notificationUrl: r.notificationUrl };
    if (r.fuelType === "PETROL") day.petrol = r.price;
    else day.diesel = r.price;
    days.set(date, day);
  }
  const newestFirst = [...days.values()].sort((a, b) => (a.date < b.date ? 1 : -1));

  const pk: FuelPageData["pk"] = {};
  for (const fuelType of ["PETROL", "DIESEL"] as const) {
    const [latest, before] = rows.filter(r => r.fuelType === fuelType);
    if (!latest) continue;
    const change = priceChange(before?.price, latest.price);
    pk[fuelType] = {
      price: latest.price, effectiveDate: pkDayKey(new Date(latest.effectiveDate)), previous: before?.price ?? null,
      diff: change?.diff ?? null, pct: change?.pct ?? null, source: latest.source, notificationUrl: latest.notificationUrl,
      approvedAt: new Date(latest.approvedAt).toISOString(),
    };
  }

  const news: FuelNews[] = newestFirst.slice(0, 8).map((d, i) => ({
    ...d, previousPetrol: newestFirst[i + 1]?.petrol ?? null, previousDiesel: newestFirst[i + 1]?.diesel ?? null,
  }));

  const oil: FuelPageData["oil"] = {};
  for (const q of quotes) {
    oil[q.commodity] = {
      price: q.price, previousClose: q.previousClose ?? null, change: q.change ?? null, percentChange: q.percentChange ?? null,
      marketTimestamp: new Date(q.marketTimestamp).toISOString(), updatedAt: new Date(q.updatedAt).toISOString(), symbol: q.symbol,
    };
  }
  const oilHistory: FuelPageData["oilHistory"] = { BRENT: [], WTI: [] };
  for (const h of history) oilHistory[h.commodity].push({ date: h.date, price: h.price });
  for (const c of ["BRENT", "WTI"] as const) oilHistory[c] = oilHistory[c].slice(-30);

  return { pk, pkHistory: newestFirst.slice(0, 60).reverse(), news, oil, oilHistory, oilUpdatedAt: (status as FuelStatus).oil?.lastSuccessAt ?? null };
}

/** The public fuel page and the blog's fuel card (cached for everyone). */
export function getFuelPageData(): Promise<FuelPageData> {
  return unstable_cache(load, ["fuel-page"], { revalidate: REVALIDATE, tags: [FUEL_TAG] })();
}

/** Admin → Fuel prices: the public data (read live), waiting and recent reviews, and the jobs' status. */
export async function getFuelAdminData() {
  await connectDB();
  const [data, waiting, reviewed, status] = await Promise.all([
    load(),
    FuelPriceUpdate.find({ status: { $in: ["PENDING", "FAILED"] } }).sort({ listedDay: -1, createdAt: -1 }).limit(30).lean(),
    FuelPriceUpdate.find({ status: { $in: ["APPROVED", "REJECTED", "SKIPPED"] } }).sort({ updatedAt: -1 }).limit(20).populate("reviewedBy", "name email").lean(),
    getFuelStatus(),
  ]);
  return JSON.parse(JSON.stringify({
    ...data, waiting, reviewed, status,
    config: { oilKey: !!process.env.ALPHA_VANTAGE_API_KEY, gemini: !!process.env.GEMINI_API_KEY, cron: !!process.env.CRON_SECRET },
  }));
}
