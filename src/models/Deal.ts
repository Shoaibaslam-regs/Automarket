import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";
import { CONDITIONS } from "../lib/vehicleOptions";

/**
 * A business's deal: a stand-alone offer on a vehicle with its own photos and details, published for a
 * period. It is separate from listings; nothing has to be listed first.
 */
export interface IDeal extends Omit<Document, "model"> {
  organizationId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  /** SALE: a discounted vehicle for sale. RENT: a bookable rental package, priced per day */
  dealType: "SALE" | "RENT";
  /** Cars in the package, e.g. 3 for a wedding convoy; 1 for a single vehicle */
  vehicleCount: number;
  /** Refundable security deposit for RENT deals, in PKR */
  deposit?: number;
  make: string;
  model: string;
  year: number;
  mileage?: number;
  fuelType?: string;
  transmission?: string;
  color?: string;
  condition: string;
  /** City */
  location: string;
  /** Shop / pickup address where the deal is offered */
  address?: string;
  /** AI-checked vehicle photos; the first is the main one */
  images: string[];
  /** Normal price in PKR before the discount: the sale price, or for RENT deals the package price per day */
  price: number;
  discountType: "PERCENT" | "AMOUNT";
  /** Percent (1–90) or PKR amount off `price` */
  discountValue: number;
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
    description: { type: String, trim: true, maxlength: 2000 },
    dealType: { type: String, enum: ["SALE", "RENT"], default: "SALE" },
    vehicleCount: { type: Number, min: 1, max: 50, default: 1 },
    deposit: { type: Number, min: 0 },
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    mileage: { type: Number, min: 0 },
    fuelType: { type: String },
    transmission: { type: String },
    color: { type: String, trim: true },
    condition: { type: String, enum: CONDITIONS, required: true },
    location: { type: String, required: true, trim: true },
    address: { type: String, trim: true, maxlength: 200 },
    images: { type: [String], default: [] },
    price: { type: Number, required: true, min: 1 },
    discountType: { type: String, enum: ["PERCENT", "AMOUNT"], required: true },
    discountValue: { type: Number, required: true, min: 1 },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    paused: { type: Boolean, default: false },
    disabledByAdmin: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

DealSchema.index({ organizationId: 1, endsAt: -1 });
// The public deals page looks up running deals by date
DealSchema.index({ endsAt: 1, startsAt: 1 });

export const Deal = defineModel<IDeal>("Deal", DealSchema);
