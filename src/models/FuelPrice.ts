import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/**
 * An approved Pakistani fuel price (src/lib/fuelPrices.ts): one per fuel type per effective day. Only an admin's
 * approval (Admin → Fuel prices) creates one, so the public page never shows unverified prices.
 */
export interface IFuelPrice extends Document {
  fuelType: "PETROL" | "DIESEL";
  price: number;
  currency: "PKR";
  unit: "litre";
  country: "PK";
  effectiveDate: Date;
  notificationDate?: Date;
  /** "Petroleum Division press release", or the admin's source for a manual entry */
  source: string;
  notificationUrl?: string;
  updateId?: mongoose.Types.ObjectId;
  approvedBy: mongoose.Types.ObjectId;
  approvedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FuelPriceSchema = new Schema<IFuelPrice>(
  {
    fuelType: { type: String, enum: ["PETROL", "DIESEL"], required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "PKR" },
    unit: { type: String, default: "litre" },
    country: { type: String, default: "PK" },
    effectiveDate: { type: Date, required: true },
    notificationDate: { type: Date },
    source: { type: String, required: true, maxlength: 200 },
    notificationUrl: { type: String, maxlength: 500 },
    updateId: { type: Schema.Types.ObjectId, ref: "FuelPriceUpdate" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// One price per fuel per day; the newest day is the current price
FuelPriceSchema.index({ fuelType: 1, effectiveDate: -1 }, { unique: true });

export const FuelPrice = defineModel<IFuelPrice>("FuelPrice", FuelPriceSchema);
