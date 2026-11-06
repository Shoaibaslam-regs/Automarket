import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/mongodb";
import { FuelPrice } from "@/models/FuelPrice";
import { FuelPriceUpdate } from "@/models/FuelPriceUpdate";
import { getFuelStatus } from "@/lib/fuelJobs";
import { FUEL_TAG } from "@/lib/pageCache";
import { FUEL_HISTORY_DAYS, historyStart, parseDay, pkDayKey, priceChange, type FuelType } from "@/lib/fuelPrices";

// What the fuel pages show, read from MongoDB only (never from the outside sources while someone waits): approved
// Pakistani prices. Public reads are cached for everyone (FUEL_TAG, cleared by invalidateFuel on every approval,
// manual entry, edit and removal), so the pages add no database load per visitor. (Brent and WTI were removed at the
// owner's request: no free source gave current prices.)

const REVALIDATE = 300;

export type PkPrice = { price: number; effectiveDate: string; previous: number | null; diff: number | null; pct: number | null; source: string; notificationUrl?: string; approvedAt: string };
export type PkDay = { date: string; petrol: number | null; diesel: number | null; notificationUrl?: string };
export type FuelNews = PkDay & { previousPetrol: number | null; previousDiesel: number | null };

export type FuelPageData = {
  pk: Partial<Record<FuelType, PkPrice>>;
  /** Approved days of the last FUEL_HISTORY_DAYS (2 months), oldest first, for the chart */
  pkHistory: PkDay[];
  /** The latest approved changes, newest first */
  news: FuelNews[];
};

type PriceRow = { fuelType: FuelType; price: number; effectiveDate: Date; source: string; notificationUrl?: string; approvedAt: Date };

async function load(): Promise<FuelPageData> {
  await connectDB();
  const rows = await FuelPrice.find().sort({ effectiveDate: -1 }).limit(800).lean<PriceRow[]>();

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

  const since = newestFirst[0] ? historyStart(newestFirst[0].date) : "";
  return { pk, pkHistory: newestFirst.filter(d => d.date >= since).reverse(), news };
}

/** When the team last checked the Pakistani prices shown (the newer of the two approvals), for "Updated …". */
export function latestCheck(data: Pick<FuelPageData, "pk"> | null): string | null {
  const days = [data?.pk.PETROL?.approvedAt, data?.pk.DIESEL?.approvedAt].filter((d): d is string => !!d).sort();
  return days[days.length - 1] ?? null;
}

/** The public fuel page and the blog's fuel card (cached for everyone). */
export function getFuelPageData(): Promise<FuelPageData> {
  return unstable_cache(load, ["fuel-page"], { revalidate: REVALIDATE, tags: [FUEL_TAG] })();
}

/** Admin → Fuel prices: the public data (read live), waiting and recent reviews, and the jobs' status. */
export async function getFuelAdminData() {
  await connectDB();
  const cutoff = parseDay(historyStart(pkDayKey(new Date())))!;
  const [data, waiting, reviewed, status, olderDays] = await Promise.all([
    load(),
    FuelPriceUpdate.find({ status: { $in: ["PENDING", "FAILED"] } }).sort({ listedDay: -1, createdAt: -1 }).limit(30).lean(),
    FuelPriceUpdate.find({ status: { $in: ["APPROVED", "REJECTED", "SKIPPED"] }, hiddenFromTrail: { $ne: true } }).sort({ updatedAt: -1 }).limit(20).populate("reviewedBy", "name email").lean(),
    getFuelStatus(),
    FuelPrice.distinct("effectiveDate", { effectiveDate: { $lt: cutoff } }),
  ]);
  return JSON.parse(JSON.stringify({
    ...data, waiting, reviewed, status,
    // Published days older than FUEL_HISTORY_DAYS, which "Remove older history" would delete (the latest day is kept)
    olderHistory: { days: olderDays.length, keepDays: FUEL_HISTORY_DAYS },
    config: { gemini: !!process.env.GEMINI_API_KEY, cron: !!process.env.CRON_SECRET },
  }));
}
