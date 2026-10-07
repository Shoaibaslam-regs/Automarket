import mongoose from "mongoose";
import { Message } from "@/models/Message";
import { Rental } from "@/models/Rental";
import { Booking } from "@/models/Booking";
import { Review } from "@/models/Review";

export type RatingSummary = { average: number; count: number };

/**
 * Only people who have actually dealt with a seller may review them: they messaged each other,
 * or the reviewer has a confirmed booking on one of the seller's rentals. Stops drive-by fake reviews.
 */
export async function canReviewSeller(reviewerId: string, sellerId: string): Promise<boolean> {
  if (reviewerId === sellerId) return false;
  const messaged = await Message.exists({
    $or: [
      { senderId: reviewerId, receiverId: sellerId },
      { senderId: sellerId, receiverId: reviewerId },
    ],
  });
  if (messaged) return true;
  const rentalIds = await Rental.find({ ownerId: sellerId }).distinct("_id");
  if (rentalIds.length === 0) return false;
  return !!(await Booking.exists({
    renterId: reviewerId,
    rentalId: { $in: rentalIds },
    status: { $in: ["CONFIRMED", "ACTIVE", "COMPLETED"] },
  }));
}

/** Average rating and review count per seller, for any number of sellers in one query. */
export async function getSellerRatings(sellerIds: string[]): Promise<Map<string, RatingSummary>> {
  const ids = sellerIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
  const rows = await Review.aggregate<{ _id: mongoose.Types.ObjectId; average: number; count: number }>([
    { $match: { sellerId: { $in: ids } } },
    { $group: { _id: "$sellerId", average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  return new Map(rows.map(r => [String(r._id), { average: Math.round(r.average * 10) / 10, count: r.count }]));
}
