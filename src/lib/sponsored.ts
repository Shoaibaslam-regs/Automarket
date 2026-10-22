import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Ad } from "@/models/Ad";
import { Deal } from "@/models/Deal";
import { Listing } from "@/models/Listing";
import { Organization } from "@/models/Organization";
import { CARD_SELLER_POPULATE } from "@/lib/cardSeller";
import { liveQuery, type PublicDeal } from "@/lib/publicDeals";
import { getBusinessRatings } from "@/lib/reviews";
import { isVerified, SPONSORED_AD, type BadgeVerification } from "@/lib/plans";
import type { IListing } from "@/models/Listing";

type Oid = mongoose.Types.ObjectId;

export type SponsoredShop = {
  id: string; name: string; slug: string; type: string; logo?: string; city?: string;
  verified: boolean; rating: { average: number; count: number };
};

/** One card in the home page's Sponsored row (plain JSON). */
export type SponsoredItem =
  | { adId: string; kind: "SHOP"; shop: SponsoredShop }
  | { adId: string; kind: "DEAL"; deal: PublicDeal }
  | { adId: string; kind: "LISTING"; listing: IListing & { _id: string } };

type OrgRow = { _id: Oid; name: string; slug: string; type: string; logo?: string; city?: string; verification?: BadgeVerification };

/**
 * Approved ads running now, as cards, in the order they started. Skips ads whose business is suspended or
 * whose deal or vehicle is no longer live, so a sold car never shows as sponsored.
 */
export async function getSponsored(): Promise<SponsoredItem[]> {
  await connectDB();
  const now = new Date();
  const ads = await Ad.find({ status: "APPROVED", startsAt: { $lte: now }, endsAt: { $gt: now } })
    .sort({ startsAt: 1 }).limit(SPONSORED_AD.maxRunning)
    .select("organizationId kind targetId").lean<Array<{ _id: Oid; organizationId: Oid; kind: "SHOP" | "DEAL" | "LISTING"; targetId?: Oid }>>();
  if (!ads.length) return [];

  const ids = (k: string) => ads.filter(a => a.kind === k && a.targetId).map(a => a.targetId!);
  const [orgs, deals, listings] = await Promise.all([
    Organization.find({ _id: { $in: ads.map(a => a.organizationId) }, isActive: { $ne: false } })
      .select("name slug type logo city verification.verifiedAt verification.expiresAt").lean<OrgRow[]>(),
    Deal.find({ _id: { $in: ids("DEAL") }, ...liveQuery(now) }).lean<Array<Record<string, unknown> & { _id: Oid }>>(),
    Listing.find({ _id: { $in: ids("LISTING") }, status: "ACTIVE" }).populate(CARD_SELLER_POPULATE).lean<Array<Record<string, unknown> & { _id: Oid }>>(),
  ]);
  const orgById = new Map(orgs.map(o => [String(o._id), o]));
  const dealById = new Map(deals.map(d => [String(d._id), d]));
  const listingById = new Map(listings.map(l => [String(l._id), l]));
  const ratings = await getBusinessRatings(ads.filter(a => a.kind === "SHOP").map(a => String(a.organizationId)));

  const items: unknown[] = [];
  for (const a of ads) {
    const org = orgById.get(String(a.organizationId));
    if (!org) continue;
    const business = { id: String(org._id), name: org.name, slug: org.slug, logo: org.logo, city: org.city, verified: isVerified(org.verification) };
    if (a.kind === "SHOP") {
      items.push({ adId: a._id, kind: "SHOP", shop: { ...business, type: org.type, rating: ratings.get(String(org._id)) ?? { average: 0, count: 0 } } });
    } else if (a.kind === "DEAL") {
      const deal = dealById.get(String(a.targetId));
      if (deal) items.push({ adId: a._id, kind: "DEAL", deal: { ...deal, business } });
    } else {
      const listing = listingById.get(String(a.targetId));
      if (listing) items.push({ adId: a._id, kind: "LISTING", listing });
    }
  }
  return JSON.parse(JSON.stringify(items)) as SponsoredItem[];
}
