import mongoose from "mongoose";
import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/mongodb";
import { Ad } from "@/models/Ad";
import { Deal } from "@/models/Deal";
import { Listing } from "@/models/Listing";
import { Organization } from "@/models/Organization";
import { liveQuery } from "@/lib/publicDeals";
import { dealPrice } from "@/lib/deals";
import { sameCity } from "@/lib/ads";
import { PUBLIC_CACHE_SECONDS, SPONSORED_TAG } from "@/lib/pageCache";
import { isVerified, SPONSORED_AD, type AdTier, type BadgeVerification } from "@/lib/plans";

type Oid = mongoose.Types.ObjectId;

/** One compact sponsored card (plain JSON). SHOP ads use the logo as the picture and have no price. */
export type SponsoredItem = {
  adId: string;
  kind: "SHOP" | "DEAL" | "LISTING";
  tier: AdTier;
  href: string;
  image?: string;
  title: string;
  price?: number;
  perDay?: boolean;
  business: { name: string; slug: string; logo?: string; verified: boolean };
};

/**
 * Who is looking: their `city` (the Browse city picker) puts that city's ads first; `make` and `type` (Browse
 * filters) keep only ads for that make or for sale/rent. `limit` is how many cards to return.
 */
export type SponsoredQuery = { city?: string; make?: string; type?: "SALE" | "RENT" | ""; limit?: number };

type OrgRow = { _id: Oid; name: string; slug: string; logo?: string; type?: string; verification?: BadgeVerification };

/** Exact, case-insensitive match for a stored city ("Lahore" finds "lahore "). */
export const cityQuery = (city: string) => new RegExp(`^\\s*${city.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i");

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * How busy a city's Sponsored places are over the coming week: approved Standard and Top ads that run at any time
 * in it. The Promote page turns this into "about 1 in N visits" (standardShare in plans.ts).
 */
export async function cityAdLoad(city: string | undefined): Promise<{ standard: number; top: number }> {
  await connectDB();
  if (!city?.trim()) return { standard: 0, top: 0 };
  const now = new Date();
  const ads = await Ad.find({ status: "APPROVED", city: cityQuery(city), startsAt: { $lt: new Date(now.getTime() + WEEK_MS) }, endsAt: { $gt: now } })
    .select("tier").lean<Array<{ tier?: AdTier }>>();
  const top = ads.filter(a => a.tier === "TOP").length;
  return { standard: ads.length - top, top };
}

/**
 * Whether a Top ad can run in `city` from `start` for `weeks`: null when a Top place is free for all of it,
 * otherwise the first date one frees up (at most SPONSORED_AD.topPerCity Top ads run in a city at once).
 * An ad without a city has no Top limit.
 */
export async function topBlockedUntil(city: string | undefined, start: Date, weeks: number, ignoreAdId?: string): Promise<Date | null> {
  if (!city?.trim()) return null;
  await connectDB();
  const end = new Date(start.getTime() + weeks * WEEK_MS);
  const overlapping = await Ad.find({
    status: "APPROVED", tier: "TOP", city: cityQuery(city), startsAt: { $lt: end }, endsAt: { $gt: start },
    ...(ignoreAdId ? { _id: { $ne: ignoreAdId } } : {}),
  }).select("endsAt").sort({ endsAt: 1 }).lean<Array<{ endsAt: Date }>>();
  if (overlapping.length < SPONSORED_AD.topPerCity) return null;
  return overlapping[overlapping.length - SPONSORED_AD.topPerCity].endsAt;
}

/** A random order where heavier items tend to come first (weighted shuffle: key = random^(1/weight)). */
function weightedShuffle<T>(items: T[], weight: (t: T) => number): T[] {
  return items
    .map(t => ({ t, k: Math.pow(Math.random(), 1 / Math.max(0.01, weight(t))) }))
    .sort((x, y) => y.k - x.k)
    .map(x => x.t);
}

type Candidate = SponsoredItem & { city?: string; make?: string; sells: "SALE" | "RENT" | "BOTH" };

/**
 * (getSponsored, below) Sponsored cards for one visitor, picked again on every call so ads rotate (the API and the home page cache it
 * for PUBLIC_CACHE_SECONDS, so the order changes about once a minute). Order: Top ads in the visitor's city, then
 * that city's Standard ads in a weighted random order (Verified businesses a little more often), then ads from
 * other cities to fill the row. Skips ads whose business is suspended or whose deal or vehicle is no longer live.
 */
/** Every running ad as a card with what filtering needs (city, make, sale/rent). The same for everyone. */
async function loadCandidates(): Promise<Candidate[]> {
  await connectDB();
  const now = new Date();
  const ads = await Ad.find({ status: "APPROVED", startsAt: { $lte: now }, endsAt: { $gt: now } })
    .limit(1000)
    .select("organizationId kind targetId tier city")
    .lean<Array<{ _id: Oid; organizationId: Oid; kind: "SHOP" | "DEAL" | "LISTING"; targetId?: Oid; tier?: AdTier; city?: string }>>();
  if (!ads.length) return [];

  const ids = (k: string) => ads.filter(a => a.kind === k && a.targetId).map(a => a.targetId!);
  const [orgs, deals, listings] = await Promise.all([
    Organization.find({ _id: { $in: ads.map(a => a.organizationId) }, isActive: { $ne: false } })
      .select("name slug logo type verification.verifiedAt verification.expiresAt").lean<OrgRow[]>(),
    Deal.find({ _id: { $in: ids("DEAL") }, ...liveQuery(now) }).select("title images price discountType discountValue dealType make")
      .lean<Array<{ _id: Oid; title: string; images: string[]; price: number; discountType: "PERCENT" | "AMOUNT"; discountValue: number; dealType?: string; make?: string }>>(),
    Listing.find({ _id: { $in: ids("LISTING") }, status: "ACTIVE" }).select("title images price type make")
      .lean<Array<{ _id: Oid; title: string; images: string[]; price: number; type: string; make?: string }>>(),
  ]);
  const orgById = new Map(orgs.map(o => [String(o._id), o]));
  const dealById = new Map(deals.map(d => [String(d._id), d]));
  const listingById = new Map(listings.map(l => [String(l._id), l]));

  const candidates: Candidate[] = [];
  for (const a of ads) {
    const org = orgById.get(String(a.organizationId));
    if (!org) continue;
    const business = { name: org.name, slug: org.slug, logo: org.logo, verified: isVerified(org.verification) };
    const base = { adId: String(a._id), tier: a.tier ?? "STANDARD", city: a.city, business } as const;
    if (a.kind === "SHOP") {
      const sells = org.type === "RENTAL" ? "RENT" : org.type === "DEALER" ? "SALE" : "BOTH";
      candidates.push({ ...base, kind: "SHOP", href: `/dealers/${org.slug}`, image: org.logo, title: org.name, sells });
    } else if (a.kind === "DEAL") {
      const d = dealById.get(String(a.targetId));
      if (d) candidates.push({ ...base, kind: "DEAL", href: `/deals/${d._id}`, image: d.images[0], title: d.title, price: dealPrice(d.price, d), perDay: d.dealType === "RENT", make: d.make, sells: d.dealType === "RENT" ? "RENT" : "SALE" });
    } else {
      const l = listingById.get(String(a.targetId));
      if (l) candidates.push({ ...base, kind: "LISTING", href: `/listings/${l._id}`, image: l.images[0], title: l.title, price: l.price, perDay: l.type === "RENT", make: l.make, sells: l.type === "RENT" ? "RENT" : l.type === "BOTH" ? "BOTH" : "SALE" });
    }
  }
  return candidates;
}

/**
 * The running ads, cached for PUBLIC_CACHE_SECONDS and shared by every query, so a stream of made-up cities or
 * makes on the public /api/sponsored can't turn into database reads (only the filtering and shuffling below run
 * per call). Approving or stopping an ad clears it (SPONSORED_TAG).
 */
const cachedCandidates = unstable_cache(loadCandidates, ["sponsored-candidates"], { revalidate: PUBLIC_CACHE_SECONDS, tags: [SPONSORED_TAG] });

export async function getSponsored(q: SponsoredQuery = {}): Promise<SponsoredItem[]> {
  const candidates = await cachedCandidates();
  // Browse context: a make filter keeps only that make's vehicles and deals; a type keeps what is for sale or rent
  const matching = candidates.filter(c =>
    (!q.make || (c.make ? c.make.trim().toLowerCase() === q.make.trim().toLowerCase() : false)) &&
    (!q.type || c.sells === "BOTH" || c.sells === q.type)
  );

  const weight = (c: Candidate) => (c.business.verified ? 1.5 : 1);
  const local = q.city ? matching.filter(c => sameCity(c.city, q.city)) : matching;
  const elsewhere = q.city ? matching.filter(c => !sameCity(c.city, q.city)) : [];
  const ordered = [
    ...weightedShuffle(local.filter(c => c.tier === "TOP"), weight),
    ...weightedShuffle(local.filter(c => c.tier !== "TOP"), weight),
    ...weightedShuffle(elsewhere, weight),
  ];
  return ordered.slice(0, Math.max(1, Math.min(48, q.limit ?? SPONSORED_AD.slotsShown)))
    // Only what a card needs reaches the page
    .map((c): SponsoredItem => ({ adId: c.adId, kind: c.kind, tier: c.tier, href: c.href, image: c.image, title: c.title, price: c.price, perDay: c.perDay, business: c.business }));
}
