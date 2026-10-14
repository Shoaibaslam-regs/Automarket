import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/**
 * One entry per listing or deal ever created. It is never deleted, even when the listing or deal is,
 * so the monthly quota (listings and deals share it) counts everything posted in the month.
 */
export interface IListingLog extends Document {
  /** Who posted it: the listing's seller, or the team member who created the deal */
  sellerId: mongoose.Types.ObjectId;
  listingId?: mongoose.Types.ObjectId;
  dealId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ListingLogSchema = new Schema<IListingLog>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    listingId: { type: Schema.Types.ObjectId, ref: "Listing" },
    dealId: { type: Schema.Types.ObjectId, ref: "Deal" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ListingLogSchema.index({ sellerId: 1, createdAt: -1 });
// Each listing or deal is logged once; entries of the other kind leave the field out
ListingLogSchema.index({ listingId: 1 }, { unique: true, partialFilterExpression: { listingId: { $exists: true } } });
ListingLogSchema.index({ dealId: 1 }, { unique: true, partialFilterExpression: { dealId: { $exists: true } } });

export const ListingLog = defineModel<IListingLog>("ListingLog", ListingLogSchema);
