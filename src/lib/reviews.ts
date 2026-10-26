import mongoose from "mongoose";
import { BusinessReview } from "@/models/BusinessReview";
import { Booking } from "@/models/Booking";
import { Customer } from "@/models/Customer";
import { Organization } from "@/models/Organization";
import { Purchase } from "@/models/Purchase";
import { User } from "@/models/User";
import { getBusinessRentals, getOrgUserIds } from "@/lib/business";
import { getOrgDealIds } from "@/lib/dealBookings";
import { isVerified, type BadgeVerification } from "@/lib/plans";

type Oid = mongoose.Types.ObjectId;
export type RatingSummary = { average: number; count: number };
export type SellerBusiness = { id: string; name: string; slug: string; type: string; city?: string; logo?: string; verified: boolean };

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
    .select("name slug type city logo verification.verifiedAt verification.expiresAt")
    .lean<Array<{ _id: Oid; name: string; slug: string; type: string; city?: string; logo?: string; verification?: BadgeVerification }>>();
  const byId = new Map(orgs.map(o => [String(o._id), o]));
  const out = new Map<string, SellerBusiness>();
  for (const u of users) {
    const o = byId.get(String(u.organizationId));
    if (o) out.set(String(u._id), { id: String(o._id), name: o.name, slug: o.slug, type: o.type, city: o.city, logo: o.logo, verified: isVerified(o.verification) });
  }
  return out;
}

/**
 * Only people the business has really dealt with may review it, so throwaway accounts can't pile on:
 * the business confirmed their booking (a rental, rent deal or off-list walk-in), agreed a price with them or sold
 * to them, or moved them to Test drive or Sold in its customer list. Sending a message or a request isn't enough
 * (a request adds an "Interested" or "Negotiating" customer automatically). Team members can't review their own business.
 */
export async function canReviewBusiness(reviewerId: string, orgId: string): Promise<boolean> {
  const memberIds = await getOrgUserIds(orgId);
  if (memberIds.some(id => String(id) === reviewerId)) return false;

  const reviewer = new mongoose.Types.ObjectId(reviewerId);
  if (await Customer.exists({ organizationId: orgId, userId: reviewer, status: { $in: ["TEST_DRIVE", "SOLD"] } })) return true;
  if (await Purchase.exists({ organizationId: orgId, buyerId: reviewer, status: { $in: ["ACCEPTED", "COMPLETED"] } })) return true;

  const owner = await Organization.findById(orgId).select("ownerId").lean<{ ownerId: Oid }>();
  if (!owner) return false;
  const rentalIds = (await getBusinessRentals(String(owner.ownerId))).map(r => r._id);
  // Booking one of its rental vehicles or one of its rent deals both count
  const dealIds = await getOrgDealIds(orgId);
  return !!(await Booking.exists({
    renterId: reviewer,
    $or: [{ rentalId: { $in: rentalIds } }, { dealId: { $in: dealIds } }, { organizationId: new mongoose.Types.ObjectId(orgId) }],
    status: { $in: ["CONFIRMED", "ACTIVE", "COMPLETED"] },
  }));
}

