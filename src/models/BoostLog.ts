import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/**
 * One boost used (src/lib/boosts.ts). Counted per plan holder and calendar month, and never deleted when the vehicle
 * or deal goes, so a used boost stays used. `fullUntil` is when it would end on a plan that keeps running; the item's
 * own `boostedUntil` is that, cut to the plan's end (and set again if the plan is renewed).
 */
export interface IBoostLog extends Document {
  /** "org:<id>" for a business (its owner's plan), "user:<id>" for a private seller */
  account: string;
  listingId?: mongoose.Types.ObjectId;
  dealId?: mongoose.Types.ObjectId;
  by: mongoose.Types.ObjectId;
  fullUntil: Date;
  createdAt: Date;
}

const BoostLogSchema = new Schema<IBoostLog>(
  {
    account: { type: String, required: true },
    listingId: { type: Schema.Types.ObjectId, ref: "Listing" },
    dealId: { type: Schema.Types.ObjectId, ref: "Deal" },
    by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fullUntil: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

BoostLogSchema.index({ account: 1, createdAt: -1 });

export const BoostLog = defineModel<IBoostLog>("BoostLog", BoostLogSchema);
