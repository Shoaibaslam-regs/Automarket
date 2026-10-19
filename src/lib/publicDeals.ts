import mongoose from "mongoose";
import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/mongodb";
import { Deal } from "@/models/Deal";
import { Organization } from "@/models/Organization";
import { getBusinessRatings } from "@/lib/reviews";
import { isVerified, type BadgeVerification } from "@/lib/plans";
import { DEALS_TAG, PUBLIC_CACHE_SECONDS, dealTag } from "@/lib/pageCache";

type Oid = mongoose.Types.ObjectId;

/** The business shown with a deal. */
export type DealBusiness = { id: string; name: string; slug: string; logo?: string; city?: string; verified: boolean };

/** A deal as public pages receive it: plain JSON, so ids and dates are strings. */
export type PublicDeal = {
  _id: string;
  title: string;
  description?: string;
  /** Older deals have no type and are sales */
  dealType?: "SALE" | "RENT";
  vehicleCount?: number;
  deposit?: number;
  make: string;
  model: string;
  year: number;
  mileage?: number;
  fuelType?: string;
  transmission?: string;
  color?: string;
  condition: string;
  location: string;
  address?: string;
  images: string[];
  price: number;
  discountType: "PERCENT" | "AMOUNT";
  discountValue: number;
  startsAt: string;
  endsAt: string;
  paused: boolean;
  disabledByAdmin: boolean;
  business: DealBusiness;
};

type OrgRow = { _id: Oid; name: string; slug: string; logo?: string; city?: string; phone?: string; address?: string; ownerId: Oid; verification?: BadgeVerification };
const ORG_FIELDS = "name slug logo city phone address ownerId verification.verifiedAt verification.expiresAt";

const toBusiness = (o: OrgRow): DealBusiness => ({
  id: String(o._id), name: o.name, slug: o.slug, logo: o.logo, city: o.city, verified: isVerified(o.verification),
});

/** Running right now: started, not ended, not paused or switched off by an admin. */
/** Deals that are running now (not paused, not switched off by an admin, between their start and end). */
export const liveQuery = (now: Date) => ({ paused: false, disabledByAdmin: false, startsAt: { $lte: now }, endsAt: { $gte: now } });

export type DealFilters = { make?: string; city?: string; orgId?: string; type?: "SALE" | "RENT" | ""; sort?: "ending" | "newest" | "discount"; limit?: number };

/**
 * Live deals from active (not suspended) businesses, cached for PUBLIC_CACHE_SECONDS per filter set.
 * Any deal change clears every cached list (DEALS_TAG).
 */
export function getLiveDeals(filters: DealFilters = {}): Promise<PublicDeal[]> {
  const f = { make: filters.make || "", city: filters.city || "", orgId: filters.orgId || "", type: filters.type || "", sort: filters.sort || "ending", limit: filters.limit ?? 60 };
  return unstable_cache(
    async () => {
      await connectDB();
      const query: Record<string, unknown> = liveQuery(new Date());
      if (f.make) query.make = f.make;
      // Deals saved before rent deals existed have no type and count as sales
      if (f.type === "RENT") query.dealType = "RENT";
      if (f.type === "SALE") query.dealType = { $ne: "RENT" };
      if (f.city) query.location = new RegExp(`^${f.city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
      if (f.orgId && mongoose.Types.ObjectId.isValid(f.orgId)) query.organizationId = new mongoose.Types.ObjectId(f.orgId);
      const sort: Record<string, 1 | -1> = f.sort === "newest" ? { createdAt: -1 } : { endsAt: 1 };
      const deals = await Deal.find(query).sort(sort).limit(f.sort === "discount" ? 200 : f.limit).lean<Array<{ organizationId: Oid; price: number; discountType: string; discountValue: number }>>();

      const orgs = await Organization.find({ _id: { $in: [...new Set(deals.map(d => String(d.organizationId)))] }, isActive: { $ne: false } })
        .select(ORG_FIELDS)
        .lean<OrgRow[]>();
      const byId = new Map(orgs.map(o => [String(o._id), toBusiness(o)]));
      let out = deals
        .filter(d => byId.has(String(d.organizationId)))
        .map(d => ({ ...d, business: byId.get(String(d.organizationId))! }));
      if (f.sort === "discount") {
        const pct = (d: (typeof out)[number]) =>
          d.discountType === "PERCENT" ? d.discountValue : (d.discountValue / d.price) * 100;
        out = out.sort((a, b) => pct(b) - pct(a)).slice(0, f.limit);
      }
      return JSON.parse(JSON.stringify(out)) as PublicDeal[];
    },
    ["live-deals", JSON.stringify(f)],
    { revalidate: PUBLIC_CACHE_SECONDS, tags: [DEALS_TAG] }
  )();
}

export type DealPage = {
  deal: PublicDeal;
  business: DealBusiness & { phone?: string; address?: string; ownerId: string };
  rating: { average: number; count: number };
};

/** One deal with its business, whatever its state (ended deals still open from shared links). Null if missing or the business is suspended. */
export function getDealPage(id: string): Promise<DealPage | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return Promise.resolve(null);
  return unstable_cache(
    async () => {
      await connectDB();
      const deal = await Deal.findById(id).lean<Record<string, unknown> & { organizationId: Oid }>();
      if (!deal) return null;
      const org = await Organization.findOne({ _id: deal.organizationId, isActive: { $ne: false } }).select(ORG_FIELDS).lean<OrgRow>();
      if (!org) return null;
      const business = { ...toBusiness(org), phone: org.phone, address: org.address, ownerId: String(org.ownerId) };
      const rating = (await getBusinessRatings([String(org._id)])).get(String(org._id)) ?? { average: 0, count: 0 };
      return JSON.parse(JSON.stringify({ deal: { ...deal, business: toBusiness(org) }, business, rating })) as DealPage;
    },
    ["deal-page", id],
    { revalidate: PUBLIC_CACHE_SECONDS, tags: [dealTag(id)] }
  )();
}

/** Makes and cities that currently have live deals, for the filter dropdowns. */
export async function getDealFacets(): Promise<{ makes: string[]; cities: string[] }> {
  const deals = await getLiveDeals({ limit: 500 });
  const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  return { makes: uniq(deals.map(d => d.make)), cities: uniq(deals.map(d => d.location.trim())) };
}
