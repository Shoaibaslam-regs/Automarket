// Client-safe rules for the search-landing pages Google sends people to:
//   /cars-for-sale/karachi          Cars for sale in Karachi
//   /cars-for-sale/karachi/honda    Honda cars for sale in Karachi
//   /cars-for-sale/pakistan/honda   Honda cars for sale in Pakistan
//   /rent-a-car/lahore              Rent a car in Lahore
// Slugs are the lower-case name with hyphens; "pakistan" means every city. Pages render at /cars-for-sale/[city]
// and /rent-a-car/[city] (src/components/seo/SeoListingPage.tsx) and are listed in the sitemap.

import { CITIES } from "@/lib/cities";
import { FEDERAL_CAPITAL, PROVINCES } from "@/lib/provinces";
import { MAKES } from "@/lib/vehicleOptions";
import { formatLakh } from "@/lib/format";

export type SeoKind = "sale" | "rent";
export type SeoPage = { kind: SeoKind; city: string | null; make: string | null };

export const ALL_PAKISTAN = "pakistan";
/** Below this many live listings a page is still shown but asks search engines not to index it (thin content). */
export const MIN_INDEXABLE = 1;
/** Listings shown on a page; the rest are one tap away on Browse. */
export const SEO_PAGE_SIZE = 24;

export const slugify = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Every city with a landing page: the Browse picker's cities first, then the provinces' (no repeats). */
export const SEO_CITIES: string[] = [...new Set([
  ...CITIES,
  FEDERAL_CAPITAL,
  ...PROVINCES.flatMap(p => [p.capital, ...p.cities]),
])];
export const SEO_MAKES: string[] = MAKES.filter(m => m !== "Other");

const CITY_BY_SLUG = new Map(SEO_CITIES.map(c => [slugify(c), c]));
const MAKE_BY_SLUG = new Map(SEO_MAKES.map(m => [slugify(m), m]));

/** The city for a slug: a name, null for "pakistan" (everywhere), or undefined when it isn't a page. */
export function cityFromSlug(slug: string): string | null | undefined {
  if (slug === ALL_PAKISTAN) return null;
  return CITY_BY_SLUG.get(slug);
}
export const makeFromSlug = (slug: string): string | undefined => MAKE_BY_SLUG.get(slug);

/** Which known city a listing's free-text location is in ("DHA Phase 6, Karachi" → Karachi), longest name first. */
const CITIES_LONGEST_FIRST = [...SEO_CITIES].sort((a, b) => b.length - a.length);
export function cityOfLocation(location: string): string | null {
  const text = ` ${location.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  return CITIES_LONGEST_FIRST.find(c => text.includes(` ${c.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `)) ?? null;
}

export function seoPath({ kind, city, make }: SeoPage): string {
  const base = kind === "rent" ? "/rent-a-car" : "/cars-for-sale";
  const place = city ? slugify(city) : ALL_PAKISTAN;
  return make ? `${base}/${place}/${slugify(make)}` : `${base}/${place}`;
}

const where = (city: string | null) => (city ? `in ${city}` : "in Pakistan");

/** The page heading: "Honda cars for sale in Karachi", "Rent a car in Lahore". */
export function seoHeading({ kind, city, make }: SeoPage): string {
  if (kind === "rent") return make ? `Rent a ${make} ${where(city)}` : `Rent a car ${where(city)}`;
  return `${make ? `${make} cars` : "Cars"} for sale ${where(city)}`;
}

/** The browser and search-result title. */
export function seoTitle(page: SeoPage, count: number): string {
  const n = count > 0 ? `${count.toLocaleString("en-PK")} ` : "";
  if (page.kind === "rent") return `${seoHeading(page)}: ${n}vehicles from owners and rental companies`;
  return `${seoHeading(page)}: ${n}${page.make ? "listings" : "used and new cars"} with prices`;
}

export type SeoStats = { count: number; minPrice: number | null; maxPrice: number | null; topMakes: string[] };

/** One or two plain sentences from the real numbers, for the page intro and the meta description. */
export function seoIntro(page: SeoPage, s: SeoStats): string {
  const place = page.city ?? "Pakistan";
  if (s.count === 0) {
    return page.kind === "rent"
      ? `No ${page.make ? `${page.make} ` : ""}vehicles are listed for rent in ${place} right now. Check nearby cities, or list your own vehicle on AutoGO.`
      : `No ${page.make ? `${page.make} ` : ""}cars are listed for sale in ${place} right now. Check nearby cities, or sell your own car on AutoGO.`;
  }
  const price = (n: number) => (page.kind === "rent" ? `PKR ${n.toLocaleString("en-PK")} a day` : `PKR ${formatLakh(n)}`);
  const range = s.minPrice && s.maxPrice
    ? s.minPrice === s.maxPrice ? ` at ${price(s.minPrice)}` : ` from ${price(s.minPrice)} to ${price(s.maxPrice)}`
    : "";
  const what = page.kind === "rent"
    ? `${s.count.toLocaleString("en-PK")} ${page.make ? `${page.make} ` : ""}vehicle${s.count !== 1 ? "s" : ""} for rent in ${place}${range}`
    : `${s.count.toLocaleString("en-PK")} ${page.make ? `${page.make} ` : ""}car${s.count !== 1 ? "s" : ""} for sale in ${place}${range}`;
  const makes = !page.make && s.topMakes.length ? ` Most listed: ${s.topMakes.slice(0, 3).join(", ")}.` : "";
  const how = page.kind === "rent"
    ? " Pick your dates, see which days are free and book online, or call the owner directly."
    : " Contact sellers directly by call, WhatsApp or message, with no middlemen.";
  return `${what}.${makes}${how}`;
}

/** The same search on Browse, with every filter (for "See all"). */
export function browseHref({ kind, city, make }: SeoPage): string {
  const p = new URLSearchParams();
  p.set("type", kind === "rent" ? "RENT" : "SALE");
  if (city) p.set("location", city);
  if (make) p.set("make", make);
  return `/listings?${p}`;
}
