import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from "@google/generative-ai";
import { connectDB } from "@/lib/mongodb";
import { FuelPrice } from "@/models/FuelPrice";
import { FuelPriceUpdate } from "@/models/FuelPriceUpdate";
import { OilMarketPrice } from "@/models/OilMarketPrice";
import { OilPriceHistory } from "@/models/OilPriceHistory";
import { SiteSetting } from "@/models/SiteSetting";
import { generateCounted } from "@/lib/usageTracker";
import { hitRateLimit } from "@/lib/rateLimit";
import { reportError } from "@/lib/errorLog";
import { invalidateFuel } from "@/lib/pageCache";
import {
  ALPHA_VANTAGE_FUNCTIONS, FRESH_NOTICE_DAYS, NOTICES_PER_RUN, OIL_SOURCE, PETROLEUM_NOTICES_URL, checkNotice, findNoticeFile,
  latestOilQuote, parseAlphaSeries, parseNoticeCalendar, petroleumUrl, pkDayKey, type Commodity, type RawNotice,
} from "@/lib/fuelPrices";

// The Fuel Price Tracker's jobs (rules in src/lib/fuelPrices.ts). runFuelJobs is called by the daily cron and by
// /api/cron/fuel (for an outside scheduler every 6 hours) and Admin → Fuel prices → Check now (which forces the oil update). Neither job ever
// deletes or overwrites approved prices or saved market data: a failure only records its error in the status.

const MODEL = process.env.GEMINI_FUEL_MODEL || process.env.GEMINI_VISION_MODEL || "gemini-3.5-flash-lite";
const STATUS_KEY = "fuelStatus";

export type JobStatus = { lastRunAt?: string; lastSuccessAt?: string; lastError?: string; lastResult?: string };
export type FuelStatus = { notices?: JobStatus; oil?: JobStatus };

async function setStatus(part: keyof FuelStatus, value: JobStatus) {
  const doc = await SiteSetting.findOne({ key: STATUS_KEY }).lean<{ value?: FuelStatus }>();
  const current = doc?.value ?? {};
  await SiteSetting.updateOne({ key: STATUS_KEY }, { $set: { value: { ...current, [part]: { ...current[part], ...value } } } }, { upsert: true });
}

export async function getFuelStatus(): Promise<FuelStatus> {
  await connectDB();
  return (await SiteSetting.findOne({ key: STATUS_KEY }).lean<{ value?: FuelStatus }>())?.value ?? {};
}

/**
 * Downloads a page or image from the Petroleum Division's own site only (never an address from a request), with a
 * time and size limit. Redirects are followed by hand so each hop is checked to stay on the site.
 */
async function fetchPetroleum(url: string, kind: "html" | "image") {
  let target = petroleumUrl(url);
  const maxBytes = kind === "html" ? 3_000_000 : 6_000_000;
  for (let hop = 0; target && hop < 4; hop++) {
    const res = await fetch(target, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "AutoGO fuel price checker", Accept: kind === "html" ? "text/html" : "image/*" },
    });
    if (res.status >= 300 && res.status < 400) {
      target = petroleumUrl(res.headers.get("location") ?? "", target);
      continue;
    }
    if (!res.ok) throw new Error(`The Petroleum Division site answered ${res.status}`);
    const type = res.headers.get("content-type")?.split(";")[0].trim() ?? "";
    if (kind === "image" ? !type.startsWith("image/") : !type.includes("html")) throw new Error(`Unexpected ${type || "unknown"} content`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > maxBytes) throw new Error("The file is too large");
    return { buf, type };
  }
  throw new Error("The address left the Petroleum Division site");
}

const PRODUCT_ROW: ResponseSchema = {
  type: SchemaType.OBJECT,
  nullable: true,
  properties: {
    existing: { type: SchemaType.NUMBER, nullable: true },
    revised: { type: SchemaType.NUMBER, nullable: true },
    change: { type: SchemaType.NUMBER, nullable: true },
  },
  required: ["existing", "revised", "change"],
};

const NOTICE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    isPriceNotice: { type: SchemaType.BOOLEAN },
    releaseDate: { type: SchemaType.STRING, nullable: true },
    effectiveDate: { type: SchemaType.STRING, nullable: true },
    previousEffectiveDate: { type: SchemaType.STRING, nullable: true },
    petrol: PRODUCT_ROW,
    diesel: PRODUCT_ROW,
  },
  // Every field is asked for (null when not printed), so the model can't stop after the first one
  required: ["isPriceNotice", "releaseDate", "effectiveDate", "previousEffectiveDate", "petrol", "diesel"],
};

const NOTICE_PROMPT = `This is an image from Pakistan's Ministry of Energy (Petroleum Division) website.

If it is a press release or notification announcing petroleum product prices, set isPriceNotice to true and copy the
numbers EXACTLY as printed (do not calculate or guess any value):
- releaseDate: the date the release is dated (e.g. "Islamabad: 7th October, 2026" gives "2026-10-07")
- effectiveDate: the date the revised/new prices take effect (the "Revised Prices w.e.f." column, or "for <date>")
- previousEffectiveDate: the "Existing Prices w.e.f." date
Write every date as YYYY-MM-DD only, with no time.
- petrol: the row for Motor Spirit (MS) / Petrol: existing price, revised price, and the increase/decrease
  (a value in brackets like (0.91) is a decrease: -0.91)
- diesel: the row for High Speed Diesel (HSD), the same way
Prices are in Rs. per litre, with their decimals. Use null for anything that is not printed. If the image is anything
else, set isPriceNotice to false and every other field to null.`;

export async function readNoticeImage(buf: Buffer, mimeType: string): Promise<RawNotice> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: MODEL,
    generationConfig: { responseMimeType: "application/json", responseSchema: NOTICE_SCHEMA, temperature: 0 },
  });
  const result = await generateCounted(model, [{ inlineData: { data: buf.toString("base64"), mimeType } }, NOTICE_PROMPT]);
  return JSON.parse(result.response.text()) as RawNotice;
}

/** The approved prices for one effective day, if any. */
async function approvedFor(day: Date) {
  const rows = await FuelPrice.find({ effectiveDate: day }).lean<{ fuelType: string; price: number }[]>();
  const by = Object.fromEntries(rows.map(r => [r.fuelType, r.price]));
  return rows.length ? { petrol: by.PETROL as number | undefined, diesel: by.DIESEL as number | undefined } : null;
}

/**
 * Looks at the official notices calendar and reads the newest releases of the last FRESH_NOTICE_DAYS it hasn't seen
 * (at most NOTICES_PER_RUN):
 * each becomes a PENDING update for an admin, FAILED when it can't be read (the admin enters it by hand), or SKIPPED
 * when its prices already match the approved ones for that day. It stops starting new releases after `budgetMs`.
 */
export async function checkFuelNotices(now = new Date(), budgetMs = 15_000) {
  const started = Date.now();
  const counts = { found: 0, pending: 0, failed: 0, skipped: 0 };
  const listUrl = process.env.PETROLEUM_NOTICES_URL || PETROLEUM_NOTICES_URL;
  const { buf } = await fetchPetroleum(listUrl, "html");
  const links = parseNoticeCalendar(buf.toString("utf8"), now);
  if (!links.length) throw new Error("No notices found on the Petroleum Notifications page (its layout may have changed)");
  counts.found = links.length;

  const seen = new Set((await FuelPriceUpdate.find({ notificationUrl: { $in: links.map(l => l.url) }, method: "AUTO" }).select("notificationUrl").lean<{ notificationUrl: string }[]>()).map(u => u.notificationUrl));
  const since = pkDayKey(new Date(now.getTime() - FRESH_NOTICE_DAYS * 86_400_000));
  const fresh = links.filter(l => l.day >= since && !seen.has(l.url)).slice(0, NOTICES_PER_RUN);

  for (const link of fresh) {
    // Vercel stops a call after 30 s: leave the rest for the next run (each release is remembered once read)
    if (Date.now() - started > budgetMs) break;
    const base = { notificationUrl: link.url, listedDay: link.day, method: "AUTO" as const };
    try {
      const page = await fetchPetroleum(link.url, "html");
      const file = findNoticeFile(page.buf.toString("utf8"));
      if (!file) throw new Error("No release image on the notice page");
      if (file.kind === "pdf") {
        await FuelPriceUpdate.create({ ...base, fileUrl: file.url, status: "FAILED", extractionDetails: { error: "This notice is a PDF, which isn't read automatically. Enter the prices by hand." } });
        counts.failed++;
        continue;
      }
      const reads = await hitRateLimit("fuelRead", "all");
      if (!reads.ok) break; // the day's reading budget is spent: try again next run
      const image = await fetchPetroleum(file.url, "image");
      const raw = await readNoticeImage(image.buf, image.type);
      const checked = checkNotice(raw, now);
      if (!checked.data) {
        await FuelPriceUpdate.create({ ...base, fileUrl: file.url, status: "FAILED", extractionDetails: { model: MODEL, error: checked.error, warnings: checked.warnings, raw } });
        counts.failed++;
        continue;
      }
      const d = checked.data;
      const approved = await approvedFor(d.effectiveDate);
      const same = approved && approved.petrol === d.petrol && approved.diesel === d.diesel;
      await FuelPriceUpdate.create({
        ...base, fileUrl: file.url, status: same ? "SKIPPED" : "PENDING",
        notificationDate: d.releaseDate ?? undefined, effectiveDate: d.effectiveDate,
        extractedPetrolPrice: d.petrol, extractedDieselPrice: d.diesel,
        previousPetrolPrice: d.previousPetrol ?? undefined, previousDieselPrice: d.previousDiesel ?? undefined,
        extractionDetails: { model: MODEL, warnings: checked.warnings, raw, ...(same && { error: "Same prices as the ones already approved for this day" }) },
      });
      if (same) counts.skipped++;
      else counts.pending++;
    } catch (error) {
      // A duplicate key means another run took this release at the same moment: nothing to do
      if ((error as { code?: number }).code === 11000) continue;
      reportError("Fuel notice read failed:", link.url, error);
      await FuelPriceUpdate.create({ ...base, status: "FAILED", extractionDetails: { error: error instanceof Error ? error.message.slice(0, 300) : "Couldn't read the notice" } }).catch(() => {});
      counts.failed++;
    }
  }
  return counts;
}

async function alphaVantage(fn: string) {
  const key = process.env.ALPHA_VANTAGE_API_KEY?.trim();
  if (!key) throw new Error("ALPHA_VANTAGE_API_KEY is not set");
  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", fn);
  url.searchParams.set("interval", "daily");
  url.searchParams.set("apikey", key);
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Alpha Vantage answered ${res.status}`);
  return res.json().catch(() => null);
}

const COMMODITIES: Commodity[] = ["BRENT", "WTI"];
/** A year of closes is saved once (the charts go back to 1 year); after that each update only refreshes the latest */
const HISTORY_DAYS = 400;
const RECENT_DAYS = 15;
/** The data changes once a day and the free plan allows 25 requests a day: a run this soon after the last is skipped */
const OIL_REFRESH_MS = 4 * 3_600_000;

/**
 * Brent and WTI daily closes from Alpha Vantage (one request each): the latest close (with its change from the one
 * before) saved over the previous quote, and the history filled with a year of closes once (then the latest RECENT_DAYS
 * each time). A commodity that
 * fails keeps its saved data; its error is recorded. Nothing is invented: only Alpha Vantage's own closes are stored.
 */
export async function updateOilPrices() {
  const errors: string[] = [];
  let saved = 0;
  for (const [i, c] of COMMODITIES.entries()) {
    // Alpha Vantage's free plan also limits bursts: space the two requests out
    if (i > 0) await new Promise(r => setTimeout(r, 1500));
    const { points, error } = parseAlphaSeries(await alphaVantage(ALPHA_VANTAGE_FUNCTIONS[c]));
    const quote = points && latestOilQuote(points);
    if (!quote) {
      errors.push(`${c}: ${error ?? "no price"}`);
      continue;
    }
    const marketTimestamp = new Date(`${quote.date}T00:00:00Z`);
    await OilMarketPrice.updateOne(
      { commodity: c },
      { $set: { price: quote.price, previousClose: quote.previousClose, change: quote.change, percentChange: quote.percentChange, marketTimestamp, symbol: ALPHA_VANTAGE_FUNCTIONS[c], source: OIL_SOURCE, currency: "USD", unit: "barrel" } },
      { upsert: true }
    );
    const full = (await OilPriceHistory.countDocuments({ commodity: c })) >= 300;
    await OilPriceHistory.bulkWrite(points!.slice(full ? -RECENT_DAYS : -HISTORY_DAYS).map(p => ({
      updateOne: { filter: { commodity: c, date: p.date }, update: { $set: { price: p.close, marketTimestamp: new Date(`${p.date}T00:00:00Z`) } }, upsert: true },
    })));
    saved++;
  }
  if (!saved) throw new Error(errors.join(" · ") || "No prices in Alpha Vantage's answer");
  return { saved, errors };
}

/**
 * Both jobs, each on its own (one failing never stops the other), with their status recorded for the admin page.
 * A lock stops two runs overlapping.
 */
export async function runFuelJobs(now = new Date(), { forceOil = false } = {}) {
  await connectDB();
  const lock = await hitRateLimit("fuelJobLock", "run");
  if (!lock.ok) return { skipped: "Another fuel check ran a moment ago" };
  const result: Record<string, unknown> = {};
  const at = now.toISOString();

  try {
    const counts = await checkFuelNotices(now);
    result.notices = counts;
    await setStatus("notices", { lastRunAt: at, lastSuccessAt: at, lastError: "", lastResult: `${counts.pending} new, ${counts.failed} couldn't be read, ${counts.skipped} unchanged` });
    if (counts.pending || counts.failed) invalidateFuel();
  } catch (error) {
    reportError("Fuel notice check failed:", error);
    const message = error instanceof Error ? error.message.slice(0, 300) : "Check failed";
    result.notices = { error: message };
    await setStatus("notices", { lastRunAt: at, lastError: message });
  }

  const lastOil = (await getFuelStatus()).oil?.lastSuccessAt;
  if (!forceOil && lastOil && now.getTime() - new Date(lastOil).getTime() < OIL_REFRESH_MS) {
    result.oil = { skipped: "Updated less than 4 hours ago" };
    return result;
  }
  try {
    const oil = await updateOilPrices();
    result.oil = oil;
    await setStatus("oil", { lastRunAt: at, lastSuccessAt: at, lastError: oil.errors.join(" · "), lastResult: `${oil.saved} of 2 prices updated` });
    invalidateFuel();
  } catch (error) {
    reportError("Oil price update failed:", error);
    const message = error instanceof Error ? error.message.slice(0, 300) : "Update failed";
    result.oil = { error: message };
    await setStatus("oil", { lastRunAt: at, lastError: message });
  }
  return result;
}
