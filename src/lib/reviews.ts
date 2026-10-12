import mongoose from "mongoose";
import { BusinessReview } from "@/models/BusinessReview";
import { Booking } from "@/models/Booking";
import { Customer } from "@/models/Customer";
import { Deal } from "@/models/Deal";
import { Message } from "@/models/Message";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { getBusinessRentals, getOrgUserIds } from "@/lib/business";

type Oid = mongoose.Types.ObjectId;
export type RatingSummary = { average: number; count: number };
export type SellerBusiness = { id: string; name: string; slug: string; type: string; city?: string; logo?: string };

/** Average rating and review count per business, for any number of businesses in one query. */
export async function getBusinessRatings(orgIds: string[]): Promise<Map<string, RatingSummary>> {
  const ids = orgIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
  if (ids.length === 0) return new Map();
  const rows = await BusinessReview.aggregate<{ _id: Oid; average: number; count: number }>([
    { $match: { organizationId: { $in: ids } } },
    { $group: { _id: "$organizationId", average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  return new Map(rows.map(r => [String(r._id), { average: Math.round(r.average * 10) / 10, count: r.count }]));
}

/** Which sellers list on behalf of a business, keyed by seller id. Private sellers are absent. */
export async function getSellerBusinesses(sellerIds: string[]): Promise<Map<string, SellerBusiness>> {
  const ids = [...new Set(sellerIds)].filter(id => mongoose.Types.ObjectId.isValid(id));
  if (ids.length === 0) return new Map();
  const users = await User.find({ _id: { $in: ids }, organizationId: { $exists: true } })
    .select("organizationId")
    .lean<Array<{ _id: Oid; organizationId: Oid }>>();
  const orgs = await Organization.find({ _id: { $in: users.map(u => u.organizationId) }, isActive: { $ne: false } })
    .select("name slug type city logo")
    .lean<Array<{ _id: Oid; name: string; slug: string; type: string; city?: string; logo?: string }>>();
  const byId = new Map(orgs.map(o => [String(o._id), o]));
  const out = new Map<string, SellerBusiness>();
  for (const u of users) {
    const o = byId.get(String(u.organizationId));
    if (o) out.set(String(u._id), { id: String(o._id), name: o.name, slug: o.slug, type: o.type, city: o.city, logo: o.logo });
  }
  return out;
}

/**
 * Only people who have actually dealt with a business may review it: they booked one of its
 * rentals, messaged one of its team, or are in its customer list. Team members can't review their own business.
 */
export async function canReviewBusiness(reviewerId: string, orgId: string): Promise<boolean> {
  const memberIds = await getOrgUserIds(orgId);
  if (memberIds.some(id => String(id) === reviewerId)) return false;

  const reviewer = new mongoose.Types.ObjectId(reviewerId);
  if (await Customer.exists({ organizationId: orgId, userId: reviewer })) return true;
  if (await Message.exists({
    $or: [
      { senderId: reviewer, receiverId: { $in: memberIds } },
      { senderId: { $in: memberIds }, receiverId: reviewer },
    ],
  })) return true;

  const owner = await Organization.findById(orgId).select("ownerId").lean<{ ownerId: Oid }>();
  if (!owner) return false;
  const rentalIds = (await getBusinessRentals(String(owner.ownerId))).map(r => r._id);
  return !!(await Booking.exists({ renterId: reviewer, rentalId: { $in: rentalIds }, status: { $in: ["CONFIRMED", "ACTIVE", "COMPLETED"] } }));
}

/** The live deal giving the biggest discount on this listing, if its business is running one. */
export async function getBestDealForListing(orgId: string, listingId: string, price: number) {
  const now = new Date();
  const deals = await Deal.find({
    organizationId: orgId,
    paused: false,
    disabledByAdmin: false,
    startsAt: { $lte: now },
    endsAt: { $gte: now },
    $or: [{ listingIds: { $size: 0 } }, { listingIds: new mongoose.Types.ObjectId(listingId) }],
  })
    .select("title description discountType discountValue endsAt")
    .lean<Array<{ _id: Oid; title: string; description?: string; discountType: "PERCENT" | "AMOUNT"; discountValue: number; endsAt: Date }>>();
  const off = (d: (typeof deals)[number]) => (d.discountType === "PERCENT" ? (price * d.discountValue) / 100 : d.discountValue);
  return deals.sort((a, b) => off(b) - off(a))[0] ?? null;
}
