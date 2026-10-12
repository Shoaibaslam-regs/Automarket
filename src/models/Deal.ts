import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/** A business's promotion: a discount on its whole inventory or on chosen vehicles, for a period. */
export interface IDeal extends Document {
  organizationId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  discountType: "PERCENT" | "AMOUNT";
  /** Percent (1–90) or PKR amount off the sale price */
  discountValue: number;
  /** Vehicles the deal covers; empty means every vehicle the business lists */
  listingIds: mongoose.Types.ObjectId[];
  startsAt: Date;
  endsAt: Date;
  /** Paused by the business */
  paused: boolean;
  /** Switched off by an admin; the business can't turn it back on */
  disabledByAdmin: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DealSchema = new Schema<IDeal>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 500 },
    discountType: { type: String, enum: ["PERCENT", "AMOUNT"], required: true },
    discountValue: { type: Number, required: true, min: 1 },
    listingIds: { type: [{ type: Schema.Types.ObjectId, ref: "Listing" }], default: [] },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    paused: { type: Boolean, default: false },
    disabledByAdmin: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

DealSchema.index({ organizationId: 1, endsAt: -1 });

export const Deal = defineModel<IDeal>("Deal", DealSchema);
