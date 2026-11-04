import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from "@google/generative-ai";
import { connectDB } from "@/lib/mongodb";
import { FuelPrice } from "@/models/FuelPrice";
import { FuelPriceUpdate } from "@/models/FuelPriceUpdate";
import { SiteSetting } from "@/models/SiteSetting";
import { generateCounted } from "@/lib/usageTracker";
import { hitRateLimit } from "@/lib/rateLimit";
import { reportError } from "@/lib/errorLog";
import { invalidateFuel } from "@/lib/pageCache";
import {
  FRESH_NOTICE_DAYS, NOTICES_PER_RUN, OGRA_PER_RUN, OGRA_PRICES_URL, PETROLEUM_NOTICES_URL, checkNotice, findNoticeFile, ograUrl,
  parseNoticeCalendar, parseOgraList, parseOgraPdfText, petroleumUrl, pkDayKey, type RawNotice,
} from "@/lib/fuelPrices";

// The Fuel Price Tracker's job (rules in src/lib/fuelPrices.ts). runFuelJobs is called by the daily cron, by
// /api/cron/fuel (for an outside scheduler every 6 hours) and by Admin → Fuel prices → Check now. It never deletes or
// overwrites approved prices: a failure only records its error in the status.

const MODEL = process.env.GEMINI_FUEL_MODEL || process.env.GEMINI_VISION_MODEL || "gemini-3.5-flash-lite";
const STATUS_KEY = "fuelStatus";

export type JobStatus = { lastRunAt?: string; lastSuccessAt?: string; lastError?: string; lastResult?: string };
export type FuelStatus = { notices?: JobStatus };

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

/** The same for OGRA's site: its price publications page and the PDFs it links to. */
async function fetchOgra(url: string, kind: "html" | "pdf") {
  let target = ograUrl(url);
  const maxBytes = kind === "html" ? 3_000_000 : 4_000_000;
  for (let hop = 0; target && hop < 4; hop++) {
    const res = await fetch(target, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "AutoGO fuel price checker", Accept: kind === "html" ? "text/html" : "application/pdf" },
    });
    if (res.status >= 300 && res.status < 400) {
      target = ograUrl(res.headers.get("location") ?? "", target);
      continue;
    }
    if (!res.ok) throw new Error(`OGRA's site answered ${res.status}`);
    const type = res.headers.get("content-type")?.split(";")[0].trim() ?? "";
    if (kind === "pdf" ? type !== "application/pdf" : !type.includes("html")) throw new Error(`Unexpected ${type || "unknown"} content`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > maxBytes) throw new Error("The file is too large");
    return buf;
  }
  throw new Error("The address left OGRA's site");
}

/** The text of a PDF (unpdf, loaded only when a publication is read). */
async function pdfText(buf: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const { text } = await extractText(await getDocumentProxy(new Uint8Array(buf)), { mergePages: true });
  return text;
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
async function checkPetroleumNotices(now: Date, budgetMs: number) {
  const started = Date.now();
  const counts: NoticeCounts = { found: 0, pending: 0, failed: 0, skipped: 0, source: "Petroleum Division" };
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
      await saveChecked(base, file.url, raw, MODEL, now, counts);
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

type NoticeCounts = { found: number; pending: number; failed: number; skipped: number; source?: string };

/** Saves one checked release: PENDING for an admin, or SKIPPED when the same prices are already approved for that day. */
async function saveChecked(base: { notificationUrl: string; listedDay: string; method: "AUTO" }, fileUrl: string, raw: RawNotice, model: string, now: Date, counts: NoticeCounts) {
  const checked = checkNotice(raw, now);
  if (!checked.data) {
    await FuelPriceUpdate.create({ ...base, fileUrl, status: "FAILED", extractionDetails: { model, error: checked.error, warnings: checked.warnings, raw } });
    counts.failed++;
    return;
  }
  const d = checked.data;
  const approved = await approvedFor(d.effectiveDate);
  const same = approved && approved.petrol === d.petrol && approved.diesel === d.diesel;
  await FuelPriceUpdate.create({
    ...base, fileUrl, status: same ? "SKIPPED" : "PENDING",
    notificationDate: d.releaseDate ?? undefined, effectiveDate: d.effectiveDate,
    extractedPetrolPrice: d.petrol, extractedDieselPrice: d.diesel,
    previousPetrolPrice: d.previousPetrol ?? undefined, previousDieselPrice: d.previousDiesel ?? undefined,
    extractionDetails: { model, warnings: checked.warnings, raw, ...(same && { error: "Same prices as the ones already approved for this day" }) },
  });
  if (same) counts.skipped++;
  else counts.pending++;
}

/**
 * OGRA's price publications (the main source): the newest PDFs of the last FRESH_NOTICE_DAYS not read yet (at most
 * OGRA_PER_RUN), their totals read from the PDF text. No AI call, so nothing counts toward the Gemini budget.
 */
async function checkOgraNotices(now: Date, budgetMs: number): Promise<NoticeCounts> {
  const started = Date.now();
  const counts: NoticeCounts = { found: 0, pending: 0, failed: 0, skipped: 0, source: "OGRA" };
  const links = parseOgraList((await fetchOgra(process.env.OGRA_PRICES_URL || OGRA_PRICES_URL, "html")).toString("utf8"), now);
  if (!links.length) throw new Error("No publications found on OGRA's Price Publications page (its layout may have changed)");
  counts.found = links.length;
  const seen = new Set((await FuelPriceUpdate.find({ notificationUrl: { $in: links.map(l => l.url) }, method: "AUTO" }).select("notificationUrl").lean<{ notificationUrl: string }[]>()).map(u => u.notificationUrl));
  const since = pkDayKey(new Date(now.getTime() - FRESH_NOTICE_DAYS * 86_400_000));
  // Oldest first, so the days are approved in order and each one's change is against the day before
  const fresh = links.filter(l => l.day >= since && !seen.has(l.url)).slice(0, OGRA_PER_RUN).reverse();
  for (const link of fresh) {
    if (Date.now() - started > budgetMs) break;
    const base = { notificationUrl: link.url, listedDay: link.day, method: "AUTO" as const };
    try {
      const raw = parseOgraPdfText(await pdfText(await fetchOgra(link.url, "pdf")));
      // The PDF must be for the day it is listed under
      if (raw.effectiveDate && raw.effectiveDate !== link.day) raw.isPriceNotice = false;
      await saveChecked(base, link.url, raw, "OGRA PDF text", now, counts);
    } catch (error) {
      if ((error as { code?: number }).code === 11000) continue;
      reportError("OGRA publication read failed:", link.url, error);
      await FuelPriceUpdate.create({ ...base, status: "FAILED", extractionDetails: { error: error instanceof Error ? error.message.slice(0, 300) : "Couldn't read the publication" } }).catch(() => {});
      counts.failed++;
    }
  }
  return counts;
}

/**
 * Looks for new official prices: OGRA first; if OGRA's site can't be read, the Petroleum Division's calendar (whose
 * hand-edited page can lag OGRA by a week). OGRA's error is kept in the result so the admin sees it.
 */
export async function checkFuelNotices(now = new Date(), budgetMs = 15_000): Promise<NoticeCounts & { ograError?: string }> {
  try {
    return await checkOgraNotices(now, budgetMs);
  } catch (error) {
    reportError("OGRA check failed, falling back to the Petroleum Division:", error);
    const counts = await checkPetroleumNotices(now, budgetMs);
    return { ...counts, source: "Petroleum Division", ograError: error instanceof Error ? error.message.slice(0, 200) : "OGRA couldn't be read" };
  }
}

/**
 * The price check, with its status recorded for the admin page. A lock stops two runs overlapping. (The Brent and
 * WTI update was removed at the owner's request: no free source gave current prices.)
 */
export async function runFuelJobs(now = new Date()) {
  await connectDB();
  const lock = await hitRateLimit("fuelJobLock", "run");
  if (!lock.ok) return { skipped: "Another fuel check ran a moment ago" };
  const result: Record<string, unknown> = {};
  const at = now.toISOString();
  try {
    const counts = await checkFuelNotices(now);
    result.notices = counts;
    await setStatus("notices", {
      lastRunAt: at, lastSuccessAt: at,
      lastError: counts.ograError ? `OGRA couldn't be read (${counts.ograError}); used the Petroleum Division page instead` : "",
      lastResult: `${counts.source}: ${counts.pending} new, ${counts.failed} couldn't be read, ${counts.skipped} unchanged`,
    });
    if (counts.pending || counts.failed) invalidateFuel();
  } catch (error) {
    reportError("Fuel notice check failed:", error);
    const message = error instanceof Error ? error.message.slice(0, 300) : "Check failed";
    result.notices = { error: message };
    await setStatus("notices", { lastRunAt: at, lastError: message });
  }
  return result;
}
