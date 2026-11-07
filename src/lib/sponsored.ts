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
  /** SHOP ads only: what the business is and where ("Car dealer · Lahore"), and a short line about it */
  caption?: string;
  blurb?: string;
  business: { name: string; slug: string; logo?: string; verified: boolean };
};

const SHOP_KIND: Record<string, string> = { DEALER: "Car dealer", RENTAL: "Rent a car", BOTH: "Sales & rentals" };
/** Used when the business has written no description of its own. */
const SHOP_BLURB: Record<string, string> = {
  DEALER: "Browse every vehicle we have for sale.",
  RENTAL: "Book a car for a day, a week or an event.",
  BOTH: "Buy or rent from one trusted shop.",
};

/** The description's first ~90 characters, cut at a word. */
function shortBlurb(text?: string) {
  const t = text?.replace(/\s+/g, " ").trim();
  if (!t) return undefined;
  return t.length <= 90 ? t : `${t.slice(0, 90).replace(/\s+\S*$/, "")}…`;
}

/**
 * Who is looking: their `city` (the Browse city picker) puts that city's ads first; `make` and `type` (Browse
 * filters) keep only ads for that make or for sale/rent. `limit` is how many cards to return.
 */
export type SponsoredQuery = { city?: string; make?: string; type?: "SALE" | "RENT" | ""; limit?: number };

type OrgRow = { _id: Oid; name: string; slug: string; logo?: string; type?: string; city?: string; description?: string; verification?: BadgeVerification };
type DealRow = { _id: Oid; title: string; images: string[]; price: number; discountType: "PERCENT" | "AMOUNT"; discountValue: number; dealType?: string; make?: string };
type ListingRow = { _id: Oid; title: string; images: string[]; price: number; type: string; make?: string };
type Sells = "SALE" | "RENT" | "BOTH";
type CardFields = Pick<SponsoredItem, "kind" | "href" | "image" | "title" | "price" | "perDay" | "caption" | "blurb"> & { sells: Sells; make?: string };

const ORG_FIELDS = "name slug logo type city description verification.verifiedAt verification.expiresAt";
const DEAL_FIELDS = "title images price discountType discountValue dealType make";
const LISTING_FIELDS = "title images price type make";

// What each kind of ad puts on its card. The live ads (loadCandidates) and the Promote page's preview
// (sponsoredPreview) both build their cards here, so the preview is exactly what buyers get.
const businessOf = (org: OrgRow) => ({ name: org.name, slug: org.slug, logo: org.logo, verified: isVerified(org.verification) });
function shopCard(org: OrgRow): CardFields {
  const type = org.type ?? "BOTH";
  const caption = [SHOP_KIND[type] ?? "Business", org.city?.trim()].filter(Boolean).join(" · ");
  const blurb = shortBlurb(org.description) ?? SHOP_BLURB[type] ?? SHOP_BLURB.BOTH;
  const sells = org.type === "RENTAL" ? "RENT" : org.type === "DEALER" ? "SALE" : "BOTH";
  return { kind: "SHOP", href: `/dealers/${org.slug}`, image: org.logo, title: org.name, caption, blurb, sells };
}
function dealCard(d: DealRow): CardFields {
  return { kind: "DEAL", href: `/deals/${d._id}`, image: d.images[0], title: d.title, price: dealPrice(d.price, d), perDay: d.dealType === "RENT", make: d.make, sells: d.dealType === "RENT" ? "RENT" : "SALE" };
}
function listingCard(l: ListingRow): CardFields {
  return { kind: "LISTING", href: `/listings/${l._id}`, image: l.images[0], title: l.title, price: l.price, perDay: l.type === "RENT", make: l.make, sells: l.type === "RENT" ? "RENT" : l.type === "BOTH" ? "BOTH" : "SALE" };
}

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

export type TopPlaceProblem = { code: "NO_CITY" } | { code: "OWN_TOP" | "CITY_FULL"; until: Date };

/**
 * Whether a Top ad can run from `start` for `weeks`: Top places belong to a city, so a business without one can't
 * have one (NO_CITY); a business holds at most one Top place in its city at a time (OWN_TOP, with the day its own
 * ends), so two businesses really get the two places; and at most SPONSORED_AD.topPerCity run there at once
 * (CITY_FULL, with the first day one frees up). Checked when an admin approves (and the city part when asking).
 */
export async function topPlaceProblem(ad: { organizationId: Oid; city?: string | null; start: Date; weeks: number; ignoreAdId?: string }): Promise<TopPlaceProblem | null> {
  if (!ad.city?.trim()) return { code: "NO_CITY" };
  await connectDB();
  const end = new Date(ad.start.getTime() + ad.weeks * WEEK_MS);
  const own = await Ad.findOne({
    organizationId: ad.organizationId, status: "APPROVED", tier: "TOP", city: cityQuery(ad.city), startsAt: { $lt: end }, endsAt: { $gt: ad.start },
    ...(ad.ignoreAdId ? { _id: { $ne: ad.ignoreAdId } } : {}),
  }).sort({ endsAt: -1 }).select("endsAt").lean<{ endsAt: Date }>();
  if (own) return { code: "OWN_TOP", until: own.endsAt };
  const full = await topBlockedUntil(ad.city, ad.start, ad.weeks, ad.ignoreAdId);
  return full ? { code: "CITY_FULL", until: full } : null;
}

/** The last day of this business's running or upcoming Top place in its city, if it has one (Business → Promote). */
export async function ownTopUntil(organizationId: Oid, city?: string | null): Promise<Date | null> {
  if (!city?.trim()) return null;
  await connectDB();
  const own = await Ad.findOne({ organizationId, status: "APPROVED", tier: "TOP", city: cityQuery(city), endsAt: { $gt: new Date() } })
    .sort({ endsAt: -1 }).select("endsAt").lean<{ endsAt: Date }>();
  return own?.endsAt ?? null;
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
    Organization.find({ _id: { $in: ads.map(a => a.organizationId) }, isActive: { $ne: false } }).select(ORG_FIELDS).lean<OrgRow[]>(),
    Deal.find({ _id: { $in: ids("DEAL") }, ...liveQuery(now) }).select(DEAL_FIELDS).lean<DealRow[]>(),
    Listing.find({ _id: { $in: ids("LISTING") }, status: "ACTIVE" }).select(LISTING_FIELDS).lean<ListingRow[]>(),
  ]);
  const orgById = new Map(orgs.map(o => [String(o._id), o]));
  const dealById = new Map(deals.map(d => [String(d._id), d]));
  const listingById = new Map(listings.map(l => [String(l._id), l]));

  const candidates: Candidate[] = [];
  for (const a of ads) {
    const org = orgById.get(String(a.organizationId));
    if (!org) continue;
    const base = { adId: String(a._id), tier: a.tier ?? "STANDARD", city: a.city, business: businessOf(org) } as const;
    if (a.kind === "SHOP") candidates.push({ ...base, ...shopCard(org) });
    else if (a.kind === "DEAL") {
      const d = dealById.get(String(a.targetId));
      if (d) candidates.push({ ...base, ...dealCard(d) });
    } else {
      const l = listingById.get(String(a.targetId));
      if (l) candidates.push({ ...base, ...listingCard(l) });
    }
  }
  return candidates;
}

/**
 * The running ads, cached for PUBLIC_CACHE_SECONDS and shared by every query, so a stream of made-up cities or
 * makes on the public /api/sponsored can't turn into database reads (only the filtering and shuffling below run
 * per call). Approving or stopping an ad clears it (SPONSORED_TAG).
 */
// Bump the key when the shape of SponsoredItem changes, so a saved list from before is not served
const cachedCandidates = unstable_cache(loadCandidates, ["sponsored-candidates-v2"], { revalidate: PUBLIC_CACHE_SECONDS, tags: [SPONSORED_TAG] });

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
    .map((c): SponsoredItem => ({ adId: c.adId, kind: c.kind, tier: c.tier, href: c.href, image: c.image, title: c.title, price: c.price, perDay: c.perDay, caption: c.caption, blurb: c.blurb, business: c.business }));
}

/**
 * Business → Promote's preview: the card an ad for this business page, deal or vehicle would show, built by the
 * same code as the live ads, with nothing saved. Only the business's own live deals and its team's active vehicles
 * (`sellerIds`) can be previewed, like they can be promoted. Also returns what the tips need (adPreviewTips).
 */
export async function sponsoredPreview(orgId: Oid, sellerIds: Oid[], kind: "SHOP" | "DEAL" | "LISTING", targetId?: string) {
  await connectDB();
  const org = await Organization.findById(orgId).select(ORG_FIELDS).lean<OrgRow>();
  if (!org) return null;
  const business = businessOf(org);
  const facts = { kind, verified: business.verified, hasLogo: !!org.logo, hasDescription: !!org.description?.trim(), hasCity: !!org.city?.trim() };
  let card: CardFields | null = null;
  let photos = 0;
  if (kind === "SHOP") card = shopCard(org);
  else if (targetId && mongoose.isValidObjectId(targetId)) {
    if (kind === "DEAL") {
      const d = await Deal.findOne({ _id: targetId, organizationId: orgId, ...liveQuery(new Date()) }).select(DEAL_FIELDS).lean<DealRow>();
      if (d) { card = dealCard(d); photos = d.images.length; }
    } else {
      const l = await Listing.findOne({ _id: targetId, sellerId: { $in: sellerIds }, status: "ACTIVE" }).select(LISTING_FIELDS).lean<ListingRow>();
      if (l) { card = listingCard(l); photos = l.images.length; }
    }
  }
  if (!card) return null;
  const { sells: _sells, make: _make, ...shown } = card;
  void _sells; void _make;
  const item: SponsoredItem = { adId: "preview", tier: "STANDARD", ...shown, business };
  return { item, facts: { ...facts, photos, title: card.title } };
}
