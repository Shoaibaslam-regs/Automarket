import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/**
 * One money movement for a business: an expense, other income, or a payment recorded automatically
 * (booking/sale payments, installments, deposit refunds). Expenses linked to a vehicle feed profit per vehicle;
 * every entry feeds the cash book. Categories are in src/lib/money.ts.
 */
export interface ILedgerEntry extends Document {
  organizationId: mongoose.Types.ObjectId;
  type: "IN" | "OUT";
  category: string;
  /** Always positive; `type` says which way it went */
  amount: number;
  /** When it happened (manual entries use the chosen day) */
  date: Date;
  note?: string;
  /** The vehicle an expense is for: a listing, or a free-text name for vehicles not listed */
  listingId?: mongoose.Types.ObjectId;
  vehicleLabel?: string;
  /** What an automatic entry came from */
  bookingId?: mongoose.Types.ObjectId;
  purchaseId?: mongoose.Types.ObjectId;
  source: "MANUAL" | "AUTO";
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    type: { type: String, enum: ["IN", "OUT"], required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    date: { type: Date, required: true },
    note: { type: String, trim: true, maxlength: 300 },
    listingId: { type: Schema.Types.ObjectId, ref: "Listing" },
    vehicleLabel: { type: String, trim: true, maxlength: 120 },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    purchaseId: { type: Schema.Types.ObjectId, ref: "Purchase" },
    source: { type: String, enum: ["MANUAL", "AUTO"], default: "MANUAL" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

LedgerEntrySchema.index({ organizationId: 1, date: -1 });
LedgerEntrySchema.index({ organizationId: 1, listingId: 1 });

export const LedgerEntry = defineModel<ILedgerEntry>("LedgerEntry", LedgerEntrySchema);
