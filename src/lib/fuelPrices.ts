// Fuel Price Tracker rules: Pakistan's official petrol and diesel prices (OGRA price publications, the Petroleum
// Division's releases as a fallback), which an admin approves before anyone sees them. (Brent and WTI crude were removed
// at the owner's request: no free source gave current prices.) Client-safe and unit-tested
// (src/lib/__tests__/fuelPrices.test.ts); the jobs that fetch and store them are in src/lib/fuelJobs.ts.
//
// Since mid-2026 prices change daily. The main source is OGRA's "Price Publications" page, which lists one PDF per
// effective day ("Price Publication Effective Dated November 05, 2026") with the full price build-up of petrol and
// diesel; the PDFs carry real text, so the totals are read exactly (`parseOgraPdfText`), with no AI. The Petroleum
// Division's "Petroleum Notifications" calendar (a JPEG press release per day, read with Gemini vision) is only the
// fallback: it is edited by hand and fell a week behind OGRA (it stopped at 30 Oct while OGRA had 3–5 Nov), which
// showed old prices as current. Either way every price waits for an admin.

export type FuelType = "PETROL" | "DIESEL";

export const FUEL_LABEL: Record<FuelType, { name: string; short: string }> = {
  PETROL: { name: "Petrol (Motor Spirit)", short: "Petrol" },
  DIESEL: { name: "High Speed Diesel (HSD)", short: "Diesel" },
};

/** The official notices page and the hosts it serves (www.petroleum.gov.pk has a broken certificate). */
export const PETROLEUM_HOSTS = ["petroleum.gov.pk", "www.petroleum.gov.pk"];
export const PETROLEUM_NOTICES_URL = "https://petroleum.gov.pk/Detail/MDQwOGNiMTMtYWYxOC00M2Y2LWIxNTEtMGVkZTUxNjE2YzQy";

/** OGRA's price publications page, the main source (see the top of this file). */
export const OGRA_HOSTS = ["ogra.org.pk", "www.ogra.org.pk"];
export const OGRA_PRICES_URL = "https://ogra.org.pk/index.php/price-publications";
/** OGRA publications read per run: plain text, no AI call, so a week can be caught up in one run */
export const OGRA_PER_RUN = 7;

/** PKR per litre outside this band is a misread, not a price */
export const PK_PRICE_RANGE = { min: 100, max: 1500 };
/** existing + change must equal revised within this (rounding in the release) */
export const CONSISTENCY_TOLERANCE = 0.05;
/** Notices newer than this many days back are looked at; older ones are history */
export const NOTICE_LOOKBACK_DAYS = 45;
/**
 * Only releases filed in the last this many days are read: the calendar keeps months of old ones, which would
 * otherwise be read (and sent for approval) one batch at a time
 */
export const FRESH_NOTICE_DAYS = 7;
/** New notices read per run, so one run can't spend many Gemini calls */
export const NOTICES_PER_RUN = 3;

const DAY = 86_400_000;
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** A https address on the Petroleum Division's site, moved off the www host (whose certificate doesn't match). */
export function petroleumUrl(value: string, base = "https://petroleum.gov.pk/"): string | null {
  try {
    const url = new URL(value.trim(), base);
    if (!PETROLEUM_HOSTS.includes(url.hostname)) return null;
    url.protocol = "https:";
    url.hostname = "petroleum.gov.pk";
    url.port = "";
    return url.toString();
  } catch {
    return null;
  }
}

/** "YYYY-MM-DD" for a day in Pakistan time. */
export function pkDayKey(d: Date): string {
  return new Date(d.getTime() + 5 * 3_600_000).toISOString().slice(0, 10);
}

/** A real calendar day "YYYY-MM-DD", as a Date at its start in Pakistan time, or null. */
export function parseDay(value: unknown): Date | null {
  // A full timestamp ("2026-10-07T00:00:00Z") counts as its date
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) value = value.slice(0, 10);
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00+05:00`);
  return Number.isNaN(d.getTime()) || pkDayKey(d) !== value ? null : d;
}

export type NoticeLink = { url: string; day: string };

/** A https address on OGRA's site, or null. */
export function ograUrl(value: string, base = "https://ogra.org.pk/"): string | null {
  try {
    const url = new URL(value.trim().replace(/&amp;/g, "&"), base);
    if (!OGRA_HOSTS.includes(url.hostname)) return null;
    url.protocol = "https:";
    url.port = "";
    return url.toString();
  } catch {
    return null;
  }
}

const dayOf = (month: string, date: string, year: string) => {
  const m = MONTHS.indexOf(month.toLowerCase());
  return m < 0 ? null : `${year}-${String(m + 1).padStart(2, "0")}-${date.padStart(2, "0")}`;
};

/**
 * The publications on OGRA's Price Publications page, newest first: each "Effective Dated <Month DD, YYYY>" label
 * and the English download link after it. Days more than one day ahead are skipped (OGRA posts the next day's
 * prices the evening before).
 */
export function parseOgraList(html: string, now = new Date()): NoticeLink[] {
  const token = /Effective\s+Dated\s+([A-Za-z]+)\s+(\d{1,2}),\s*(20\d\d)|href="([^"]*\/download\/[^"]*)"/gi;
  const latest = pkDayKey(new Date(now.getTime() + DAY));
  const found = new Map<string, NoticeLink>();
  let day: string | null = null;
  for (const m of html.matchAll(token)) {
    if (m[1]) {
      day = dayOf(m[1], m[2], m[3]);
      continue;
    }
    if (!day) continue;
    const url = ograUrl(m[4]);
    // Each label has an English and an Urdu link: keep the English one (or the first, when unmarked)
    if (!url || /lang=ur/i.test(url)) continue;
    if (parseDay(day) && day <= latest && !found.has(url)) found.set(url, { url, day });
    day = null;
  }
  return [...found.values()].sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
}

/**
 * The prices in the text of an OGRA price publication PDF: "Total Petrol Price (excl. Secondary Freight*) RS/LTR
 * V={P+S+T+U} 362.00", the same for diesel, and "PETROL (MS) Price Effective November 05,2026" (diesel's heading must
 * name the same day). Returned in the shape checkNotice takes, so both sources are checked the same way.
 */
export function parseOgraPdfText(text: string): RawNotice {
  const flat = text.replace(/\s+/g, " ");
  const total = (fuel: string) => flat.match(new RegExp(`Total ${fuel} Price[^0-9]{0,90}?(\\d{2,4}(?:,\\d{3})*\\.\\d{1,2})`, "i"))?.[1] ?? null;
  const effective = (fuel: string) => {
    const m = flat.match(new RegExp(`${fuel}\\s*\\((?:MS|HSD)\\)\\s*Price Effective\\s+([A-Za-z]+)\\s+(\\d{1,2}),\\s*(20\\d\\d)`, "i"));
    return m ? dayOf(m[1], m[2], m[3]) : null;
  };
  const petrolDay = effective("Petrol");
  const dieselDay = effective("Diesel");
  const petrol = total("Petrol");
  const diesel = total("Diesel");
  const sameDay = petrolDay && (!dieselDay || dieselDay === petrolDay);
  return {
    isPriceNotice: !!(petrol && diesel && sameDay),
    effectiveDate: sameDay ? petrolDay : null,
    releaseDate: null,
    previousEffectiveDate: null,
    petrol: { existing: null, revised: petrol, change: null },
    diesel: { existing: null, revised: diesel, change: null },
  };
}

/**
 * The day links on the notices calendar, newest first. The page lists months (headings such as "October, 2026",
 * newest month first) with tables of day numbers, each linking to that day's NewsDetail page. Links that aren't
 * NewsDetail pages on the site (the page has hand-typed broken ones) are skipped, as are days in the future.
 */
export function parseNoticeCalendar(html: string, now = new Date()): NoticeLink[] {
  const token = /(january|february|march|april|may|june|july|august|september|october|november|december)\s*,?\s*(20\d\d)|<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let month = -1;
  let year = 0;
  const found = new Map<string, NoticeLink>();
  const today = pkDayKey(now);
  for (const m of html.matchAll(token)) {
    if (m[1]) {
      month = MONTHS.indexOf(m[1].toLowerCase());
      year = Number(m[2]);
      continue;
    }
    if (month < 0) continue;
    const text = m[4].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
    if (!/^\d{1,2}$/.test(text)) continue;
    const url = petroleumUrl(m[3]);
    if (!url || !/\/NewsDetail\//i.test(url)) continue;
    const day = `${year}-${String(month + 1).padStart(2, "0")}-${text.padStart(2, "0")}`;
    if (!parseDay(day) || day > today) continue;
    // The same detail page is sometimes linked from several days: keep the latest day it stands for
    const before = found.get(url);
    if (!before || before.day < day) found.set(url, { url, day });
  }
  return [...found.values()].sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
}

/** The press release on a NewsDetail page: its image (or a PDF, which can't be read automatically). */
export function findNoticeFile(html: string): { kind: "image" | "pdf"; url: string } | null {
  for (const m of html.matchAll(/(?:src|href)="([^"]*\/SiteImage\/(?:NewsEvents|Misc)\/[^"]+)"/gi)) {
    const url = petroleumUrl(m[1].replace(/ /g, "%20"));
    if (!url) continue;
    if (/\.(jpe?g|png|webp)(\?|$)/i.test(url)) return { kind: "image", url };
    if (/\.pdf(\?|$)/i.test(url) && !/political_map/i.test(url)) return { kind: "pdf", url };
  }
  return null;
}

const price2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v.replace(/[,\s]/g, "")) : NaN);
const inPkBand = (n: number) => Number.isFinite(n) && n >= PK_PRICE_RANGE.min && n <= PK_PRICE_RANGE.max;

/** What Gemini is asked to return for a press release image (see the schema in fuelJobs.ts). */
export type RawNotice = {
  isPriceNotice?: unknown;
  releaseDate?: unknown;
  effectiveDate?: unknown;
  previousEffectiveDate?: unknown;
  petrol?: { existing?: unknown; revised?: unknown; change?: unknown };
  diesel?: { existing?: unknown; revised?: unknown; change?: unknown };
};

export type NoticeData = {
  releaseDate: Date | null;
  effectiveDate: Date;
  petrol: number;
  diesel: number;
  previousPetrol: number | null;
  previousDiesel: number | null;
};

/**
 * Checks prices read from a press release. Hard problems (`error`) mean nothing can be approved without manual
 * entry; `warnings` (existing + change doesn't equal revised, dates out of order) are shown to the admin, who decides.
 */
export function checkNotice(raw: RawNotice, now = new Date()): { data?: NoticeData; error?: string; warnings: string[] } {
  const warnings: string[] = [];
  if (raw.isPriceNotice !== true) return { error: "The page isn't a petrol and diesel price release", warnings };
  const effectiveDate = parseDay(raw.effectiveDate);
  if (!effectiveDate) return { error: "No effective date could be read", warnings };
  const ageDays = (now.getTime() - effectiveDate.getTime()) / DAY;
  if (ageDays > NOTICE_LOOKBACK_DAYS || ageDays < -10) return { error: `The effective date ${pkDayKey(effectiveDate)} is far from today`, warnings };

  const read = (p: RawNotice["petrol"], label: string) => {
    const revised = num(p?.revised);
    if (!inPkBand(revised)) return { error: `${label}: no believable revised price (read ${String(p?.revised ?? "nothing")})` };
    const existing = num(p?.existing);
    const change = num(p?.change);
    if (inPkBand(existing) && Number.isFinite(change) && Math.abs(existing + change - revised) > CONSISTENCY_TOLERANCE) {
      warnings.push(`${label}: ${existing} ${change >= 0 ? "+" : "−"} ${Math.abs(change)} doesn't equal ${revised}. Check the image.`);
    }
    return { revised: price2(revised), existing: inPkBand(existing) ? price2(existing) : null };
  };
  const petrol = read(raw.petrol, "Petrol");
  if ("error" in petrol) return { error: petrol.error, warnings };
  const diesel = read(raw.diesel, "Diesel");
  if ("error" in diesel) return { error: diesel.error, warnings };

  const releaseDate = parseDay(raw.releaseDate);
  if (releaseDate && releaseDate.getTime() > effectiveDate.getTime()) warnings.push("The release is dated after the day the prices take effect.");
  const previous = parseDay(raw.previousEffectiveDate);
  if (previous && previous.getTime() >= effectiveDate.getTime()) warnings.push("The 'existing prices' date isn't before the new effective date.");

  return {
    data: { releaseDate, effectiveDate, petrol: petrol.revised!, diesel: diesel.revised!, previousPetrol: petrol.existing ?? null, previousDiesel: diesel.existing ?? null },
    warnings,
  };
}

/** An admin's prices (manual entry, or a correction when approving), checked on the server. */
export function parseAdminPrices(body: Record<string, unknown>, now = new Date(), needSource = true):
  { data?: { petrol: number; diesel: number; effectiveDate: Date; sourceUrl?: string; note?: string }; error?: string } {
  const petrol = num(body.petrol);
  const diesel = num(body.diesel);
  if (!inPkBand(petrol)) return { error: `Petrol must be between PKR ${PK_PRICE_RANGE.min} and ${PK_PRICE_RANGE.max} a litre` };
  if (!inPkBand(diesel)) return { error: `Diesel must be between PKR ${PK_PRICE_RANGE.min} and ${PK_PRICE_RANGE.max} a litre` };
  const effectiveDate = parseDay(body.effectiveDate);
  if (!effectiveDate) return { error: "Choose the day the prices take effect" };
  const ageDays = (now.getTime() - effectiveDate.getTime()) / DAY;
  if (ageDays > 365 || ageDays < -10) return { error: "The effective date must be within the last year and at most 10 days ahead" };
  const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
  if (sourceUrl) {
    try {
      const u = new URL(sourceUrl);
      if (u.protocol !== "https:" || sourceUrl.length > 500) throw new Error();
    } catch {
      return { error: "The source must be an https:// link" };
    }
  } else if (needSource) {
    return { error: "Add the link to the official notification" };
  }
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) : "";
  return { data: { petrol: price2(petrol), diesel: price2(diesel), effectiveDate, sourceUrl: sourceUrl || undefined, note: note || undefined } };
}

/**
 * OGRA prices go live without an admin (they are read exactly from the PDF's text) unless something looks off; then
 * they wait in Admin → Fuel prices with the reason. A move bigger than this from the approved day before is held.
 */
export const AUTO_PUBLISH_MAX_PCT = 8;

/**
 * Why a checked OGRA day must wait for an admin instead of going live by itself, or null when it can be published:
 * the check raised warnings, there is no earlier approved day to compare with (the very first price), or either fuel
 * moved more than AUTO_PUBLISH_MAX_PCT from the approved day before it.
 */
export function autoPublishHold(
  next: { petrol: number; diesel: number },
  previous: { petrol?: number | null; diesel?: number | null } | null,
  warnings: string[] = []
): string | null {
  if (warnings.length) return "The publication raised a warning";
  if (!previous || previous.petrol == null || previous.diesel == null) return "No earlier approved prices to compare with";
  for (const [label, now, before] of [["Petrol", next.petrol, previous.petrol], ["Diesel", next.diesel, previous.diesel]] as const) {
    const pct = Math.abs((now - before) / before) * 100;
    if (pct > AUTO_PUBLISH_MAX_PCT) return `${label} moved ${Math.round(pct * 10) / 10}% (from ${before} to ${now}); check it before it goes live`;
  }
  return null;
}

/** The change from one price to the next: amount and percent (rounded to 2 places). */
export function priceChange(previous: number | null | undefined, current: number): { diff: number; pct: number } | null {
  if (previous == null || !Number.isFinite(previous) || previous === 0) return null;
  const diff = price2(current - previous);
  return { diff, pct: Math.round((diff / previous) * 10_000) / 100 };
}

/** "8 Oct 2026" in Pakistan time. */
export function fuelDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" });
}

/** "8 Oct 2026, 7:15 PM" in Pakistan time. */
export function fuelTime(d: Date | string): string {
  return new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Karachi" });
}
