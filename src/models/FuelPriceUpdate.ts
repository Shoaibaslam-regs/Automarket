import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/**
 * A Petroleum Division price release the checker found (or an admin's manual entry), waiting for an admin.
 * PENDING: prices read, waiting for review. APPROVED/REJECTED: reviewed. FAILED: the release couldn't be read, so
 * the admin enters the prices by hand. SKIPPED: same prices as the ones already approved for that day (kept so the
 * release isn't read again).
 */
export interface IFuelPriceUpdate extends Document {
  /** The NewsDetail page (or the source link of a manual entry) */
  notificationUrl: string;
  /** The press release image on that page */
  fileUrl?: string;
  /** The calendar day the release is filed under */
  listedDay?: string;
  notificationDate?: Date;
  effectiveDate?: Date;
  extractedPetrolPrice?: number;
  extractedDieselPrice?: number;
  previousPetrolPrice?: number;
  previousDieselPrice?: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "FAILED" | "SKIPPED";
  method: "AUTO" | "MANUAL";
  extractionDetails?: { model?: string; warnings?: string[]; error?: string; raw?: unknown };
  /** The prices that were approved, when the admin corrected the extracted ones */
  approvedPetrolPrice?: number;
  approvedDieselPrice?: number;
  reviewNote?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FuelPriceUpdateSchema = new Schema<IFuelPriceUpdate>(
  {
    notificationUrl: { type: String, required: true, maxlength: 500 },
    fileUrl: { type: String, maxlength: 500 },
    listedDay: { type: String, maxlength: 10 },
    notificationDate: { type: Date },
    effectiveDate: { type: Date },
    extractedPetrolPrice: { type: Number },
    extractedDieselPrice: { type: Number },
    previousPetrolPrice: { type: Number },
    previousDieselPrice: { type: Number },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED", "FAILED", "SKIPPED"], required: true },
    method: { type: String, enum: ["AUTO", "MANUAL"], default: "AUTO" },
    extractionDetails: { type: Schema.Types.Mixed },
    approvedPetrolPrice: { type: Number },
    approvedDieselPrice: { type: Number },
    reviewNote: { type: String, maxlength: 300 },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

// A release is read once: the checker skips any page it has seen (manual entries can share a source link)
FuelPriceUpdateSchema.index({ notificationUrl: 1 }, { unique: true, partialFilterExpression: { method: "AUTO" } });
FuelPriceUpdateSchema.index({ status: 1, createdAt: -1 });

export const FuelPriceUpdate = defineModel<IFuelPriceUpdate>("FuelPriceUpdate", FuelPriceUpdateSchema);
