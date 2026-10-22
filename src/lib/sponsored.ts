import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Ad } from "@/models/Ad";
import { Deal } from "@/models/Deal";
import { Listing } from "@/models/Listing";
import { Organization } from "@/models/Organization";
import { liveQuery } from "@/lib/publicDeals";
import { dealPrice } from "@/lib/deals";
import { isVerified, SPONSORED_AD, type BadgeVerification } from "@/lib/plans";

type Oid = mongoose.Types.ObjectId;

/** One compact card in the home page's Sponsored row (plain JSON). SHOP ads use the logo as the picture and have no price. */
export type SponsoredItem = {
  adId: string;
  kind: "SHOP" | "DEAL" | "LISTING";
  href: string;
  image?: string;
  title: string;
  price?: number;
  perDay?: boolean;
  business: { name: string; slug: string; logo?: string; verified: boolean };
};

type OrgRow = { _id: Oid; name: string; slug: string; logo?: string; verification?: BadgeVerification };

/**
 * Approved ads running now, as compact cards, in the order they started. Skips ads whose business is suspended or
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
      .select("name slug logo verification.verifiedAt verification.expiresAt").lean<OrgRow[]>(),
    Deal.find({ _id: { $in: ids("DEAL") }, ...liveQuery(now) }).select("title images price discountType discountValue dealType")
      .lean<Array<{ _id: Oid; title: string; images: string[]; price: number; discountType: "PERCENT" | "AMOUNT"; discountValue: number; dealType?: string }>>(),
    Listing.find({ _id: { $in: ids("LISTING") }, status: "ACTIVE" }).select("title images price type")
      .lean<Array<{ _id: Oid; title: string; images: string[]; price: number; type: string }>>(),
  ]);
  const orgById = new Map(orgs.map(o => [String(o._id), o]));
  const dealById = new Map(deals.map(d => [String(d._id), d]));
  const listingById = new Map(listings.map(l => [String(l._id), l]));

  const items: SponsoredItem[] = [];
  for (const a of ads) {
    const org = orgById.get(String(a.organizationId));
    if (!org) continue;
    const business = { name: org.name, slug: org.slug, logo: org.logo, verified: isVerified(org.verification) };
    const adId = String(a._id);
    if (a.kind === "SHOP") {
      items.push({ adId, kind: "SHOP", href: `/dealers/${org.slug}`, image: org.logo, title: org.name, business });
    } else if (a.kind === "DEAL") {
      const d = dealById.get(String(a.targetId));
      if (d) items.push({ adId, kind: "DEAL", href: `/deals/${d._id}`, image: d.images[0], title: d.title, price: dealPrice(d.price, d), perDay: d.dealType === "RENT", business });
    } else {
      const l = listingById.get(String(a.targetId));
      if (l) items.push({ adId, kind: "LISTING", href: `/listings/${l._id}`, image: l.images[0], title: l.title, price: l.price, perDay: l.type === "RENT", business });
    }
  }
  return items;
}
