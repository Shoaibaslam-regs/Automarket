import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

export type AdKind = "SHOP" | "DEAL" | "LISTING";
export type AdStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "CANCELLED" | "STOPPED";

/**
 * A business's request for a sponsored spot on the home page, and once approved, the ad itself.
 * It runs from startsAt to endsAt; whether it is waiting, running or over follows from those dates
 * (see adState in src/lib/ads.ts). Prices are in SPONSORED_AD (src/lib/plans.ts).
 */
export interface IAd extends Document {
  organizationId: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId;
  kind: AdKind;
  /** The deal or listing; empty for SHOP (the business page) */
  targetId?: mongoose.Types.ObjectId;
  /** Name or title at the time of the request, so the record stays readable if the item is deleted */
  targetLabel: string;
  weeks: number;
  price: number;
  /** How the business says it paid: transaction ID, sender number and so on */
  paymentRef: string;
  note?: string;
  status: AdStatus;
  startsAt?: Date;
  endsAt?: Date;
  /** Why an admin refused or stopped it */
  reason?: string;
  handledBy?: mongoose.Types.ObjectId;
  handledAt?: Date;
  /** Cleared from the business's Promote history / the admin's Past tab; deleted once both have cleared it */
  hiddenByBusiness?: boolean;
  hiddenByAdmin?: boolean;
  createdAt: Date;
}

const AdSchema = new Schema<IAd>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: ["SHOP", "DEAL", "LISTING"], required: true },
    targetId: { type: Schema.Types.ObjectId },
    targetLabel: { type: String, required: true, maxlength: 200 },
    weeks: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    paymentRef: { type: String, required: true, trim: true, maxlength: 200 },
    note: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ["REQUESTED", "APPROVED", "REJECTED", "CANCELLED", "STOPPED"], default: "REQUESTED", index: true },
    startsAt: Date,
    endsAt: Date,
    reason: { type: String, trim: true, maxlength: 500 },
    handledBy: { type: Schema.Types.ObjectId, ref: "User" },
    handledAt: Date,
    hiddenByBusiness: { type: Boolean, default: false },
    hiddenByAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// The home page asks for approved ads running now
AdSchema.index({ status: 1, endsAt: 1 });

export const Ad = defineModel<IAd>("Ad", AdSchema);
