import mongoose from "mongoose";
import { Deal } from "@/models/Deal";
import { getBusinessRentals } from "@/lib/business";

type Oid = mongoose.Types.ObjectId;

/** Fields of a deal that booking lists, cards and slips show. */
export const DEAL_BOOKING_FIELDS = "title images make model year location address dealType vehicleCount price discountType discountValue deposit organizationId";

/** Ids of every deal the business has published. */
export async function getOrgDealIds(organizationId: Oid | string): Promise<Oid[]> {
  return Deal.find({ organizationId }).distinct("_id");
}

/**
 * Query for every booking that belongs to a business: on its members' rental vehicles, on its rent deals,
 * or walk-ins for vehicles it hasn't listed (which carry the business directly).
 * Pass the caller's user id; the organization is only needed for the deals.
 */
export async function businessBookingQuery(userId: string, organizationId: Oid | string) {
  const [rentals, dealIds] = await Promise.all([getBusinessRentals(userId), getOrgDealIds(organizationId)]);
  return {
    rentals,
    query: { $or: [{ rentalId: { $in: rentals.map(r => r._id) } }, { dealId: { $in: dealIds } }, { organizationId }] },
  };
}
