import mongoose from "mongoose";
import { Listing } from "@/models/Listing";
import { getInventorySellerIds } from "@/lib/business";
import { MAX_PERCENT } from "@/lib/deals";

/** Sale vehicles a business can put on a deal: its members' live listings that have a sale price. */
export async function getDealableListings(userId: string) {
  const sellerIds = await getInventorySellerIds(userId);
  return Listing.find({ sellerId: { $in: sellerIds }, type: { $in: ["SALE", "BOTH"] }, status: { $in: ["ACTIVE", "PENDING"] } })
    .select("title price images")
    .sort({ createdAt: -1 })
    .lean<Array<{ _id: mongoose.Types.ObjectId; title: string; price: number; images: string[] }>>();
}

type DealInput = {
  title: string;
  description?: string;
  discountType: "PERCENT" | "AMOUNT";
  discountValue: number;
  listingIds: mongoose.Types.ObjectId[];
  startsAt: Date;
  endsAt: Date;
};

/** Validates a create or edit request; vehicles must be in the business's own inventory. */
export async function parseDealInput(body: unknown, userId: string): Promise<{ data: DealInput } | { error: string }> {
  const b = (body ?? {}) as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (title.length < 3 || title.length > 80) return { error: "Give the deal a title of 3 to 80 characters" };
  const description = typeof b.description === "string" ? b.description.trim().slice(0, 500) : "";

  const discountType = b.discountType;
  if (discountType !== "PERCENT" && discountType !== "AMOUNT") return { error: "Choose a percentage or a fixed amount off" };
  const discountValue = Number(b.discountValue);
  if (!Number.isFinite(discountValue) || discountValue < 1) return { error: "Enter a discount" };
  if (discountType === "PERCENT" && (discountValue > MAX_PERCENT || !Number.isInteger(discountValue))) {
    return { error: `Percentage discounts must be a whole number from 1 to ${MAX_PERCENT}` };
  }

  const startsAt = b.startsAt ? new Date(String(b.startsAt)) : new Date();
  const endsAt = new Date(String(b.endsAt));
  if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) return { error: "Choose start and end dates" };
  // An end date means the whole of that day
  endsAt.setHours(23, 59, 59, 999);
  if (endsAt <= startsAt) return { error: "The deal must end after it starts" };

  const requested = Array.isArray(b.listingIds) ? b.listingIds.filter((x): x is string => typeof x === "string" && mongoose.Types.ObjectId.isValid(x)) : [];
  let listingIds: mongoose.Types.ObjectId[] = [];
  if (requested.length > 0) {
    const allowed = new Set((await getDealableListings(userId)).map(l => String(l._id)));
    if (requested.some(id => !allowed.has(id))) return { error: "Deals can only include your own vehicles that are for sale" };
    listingIds = requested.map(id => new mongoose.Types.ObjectId(id));
  }

  return { data: { title, description: description || undefined, discountType, discountValue, listingIds, startsAt, endsAt } };
}
