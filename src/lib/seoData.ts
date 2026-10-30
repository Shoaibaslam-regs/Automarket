// Data for the search-landing pages (src/lib/seoPages.ts): the live listings, their numbers, the popular makes
// in the city and the other cities with the same search. Cached for everyone for 5 minutes, like the public pages.

import { unstable_cache } from "next/cache";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { Rental } from "@/models/Rental";
import "@/models/Organization";
import { CARD_SELLER_POPULATE } from "@/lib/cardSeller";
import { cityOfLocation, makeFromSlug, SEO_PAGE_SIZE, slugify, type SeoPage, type SeoStats } from "@/lib/seoPages";
import { getLiveDeals, type PublicDeal } from "@/lib/publicDeals";
import type { IListing } from "@/models/Listing";

export const SEO_REVALIDATE = 300;

export type SeoPageData = {
  listings: Array<IListing & { _id: string }>;
  stats: SeoStats;
  /** Makes listed in this city (all of Pakistan when no city), most first; only makes that have a page */
  makes: { make: string; count: number }[];
  /** Cities with the same search, most first */
  cities: { city: string; count: number }[];
  /** Rent pages: the city's live rent deals */
  deals: PublicDeal[];
};

const escape = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const typesFor = (kind: SeoPage["kind"]) => (kind === "rent" ? ["RENT", "BOTH"] : ["SALE", "BOTH"]);

/** The same match as Browse with these filters (contains, case ignored), so "See all" shows the same vehicles. */
function matchFor(page: SeoPage, opts: { withCity?: boolean; withMake?: boolean } = {}): Record<string, unknown> {
  const q: Record<string, unknown> = { status: "ACTIVE", type: { $in: typesFor(page.kind) } };
  if (page.city && opts.withCity !== false) q.location = new RegExp(escape(page.city), "i");
  if (page.make && opts.withMake !== false) q.make = new RegExp(escape(page.make), "i");
  return q;
}

async function load(page: SeoPage): Promise<SeoPageData> {
  await connectDB();
  const match = matchFor(page);
  const [listings, priced, byMake, byLocation, deals] = await Promise.all([
    Listing.find(match).sort({ featured: -1, createdAt: -1 }).limit(SEO_PAGE_SIZE).populate(CARD_SELLER_POPULATE).lean(),
    Listing.find(match).select("price type").limit(5000).lean<{ _id: mongoose.Types.ObjectId; price: number; type: string }[]>(),
    page.make ? Promise.resolve([]) : Listing.aggregate<{ _id: string; n: number }>([
      { $match: matchFor(page, { withMake: false }) },
      { $group: { _id: { $toLower: { $trim: { input: "$make" } } }, n: { $sum: 1 } } },
      { $sort: { n: -1 } }, { $limit: 30 },
    ]),
    Listing.aggregate<{ _id: string; n: number }>([
      { $match: matchFor(page, { withCity: false }) },
      { $group: { _id: "$location", n: { $sum: 1 } } },
      { $sort: { n: -1 } }, { $limit: 300 },
    ]),
    page.kind === "rent" && page.city ? getLiveDeals({ city: page.city, type: "RENT", make: page.make ?? "", limit: 8 }) : Promise.resolve([]),
  ]);

  // Rent pages count the daily rate (a sale-and-rent listing's price is its sale price)
  let prices = priced.map(p => p.price);
  if (page.kind === "rent" && priced.length) {
    const rentals = await Rental.find({ listingId: { $in: priced.map(p => p._id) } }).select("dailyRate").lean<{ dailyRate: number }[]>();
    prices = rentals.map(r => r.dailyRate);
  }
  prices = prices.filter(p => Number.isFinite(p) && p > 0);

  const makes = byMake
    .map(m => ({ make: makeFromSlug(slugify(m._id ?? "")), count: m.n }))
    .filter((m): m is { make: string; count: number } => !!m.make)
    .slice(0, 12);
  const cityCounts = new Map<string, number>();
  for (const l of byLocation) {
    const city = cityOfLocation(l._id ?? "");
    if (city && city !== page.city) cityCounts.set(city, (cityCounts.get(city) ?? 0) + l.n);
  }
  const cities = [...cityCounts].map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count).slice(0, 12);

  return JSON.parse(JSON.stringify({
    listings,
    stats: {
      count: priced.length,
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
      topMakes: makes.map(m => m.make),
    },
    makes,
    cities,
    deals,
  }));
}

export function loadSeoPage(page: SeoPage): Promise<SeoPageData> {
  return unstable_cache(() => load(page), ["seo-page", page.kind, page.city ?? "all", page.make ?? "all"], { revalidate: SEO_REVALIDATE })();
}

/**
 * Every landing page worth listing in the sitemap: each city, city + make, and Pakistan + make that has at least
 * one live listing, for sale and for rent.
 */
export async function seoSitemapPaths(): Promise<SeoPage[]> {
  await connectDB();
  const groups = await Listing.aggregate<{ _id: { location: string; make: string; type: string } }>([
    { $match: { status: "ACTIVE" } },
    { $group: { _id: { location: "$location", make: { $toLower: { $trim: { input: "$make" } } }, type: "$type" } } },
    { $limit: 20000 },
  ]);
  const seen = new Map<string, SeoPage>();
  const add = (p: SeoPage) => seen.set(`${p.kind}|${p.city}|${p.make}`, p);
  for (const { _id } of groups) {
    const city = cityOfLocation(_id.location ?? "");
    const make = makeFromSlug(slugify(_id.make ?? "")) ?? null;
    const kinds: SeoPage["kind"][] = _id.type === "BOTH" ? ["sale", "rent"] : _id.type === "RENT" ? ["rent"] : ["sale"];
    for (const kind of kinds) {
      add({ kind, city: null, make: null });
      if (city) add({ kind, city, make: null });
      if (make) add({ kind, city: null, make });
      if (city && make) add({ kind, city, make });
    }
  }
  return [...seen.values()];
}
