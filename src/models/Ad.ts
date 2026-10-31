import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";
import type { AdTier } from "../lib/plans";

export type AdKind = "SHOP" | "DEAL" | "LISTING";
export type AdStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "CANCELLED" | "STOPPED";

/**
 * A business's request for a sponsored spot, and once approved, the ad itself. It runs from startsAt to endsAt;
 * whether it is waiting, running or over follows from those dates (see adState in src/lib/ads.ts). It is shown
 * to visitors in its `city` first (Top ads before Standard ones, which rotate), on the home page and between
 * Browse results (src/lib/sponsored.ts). Prices and limits are in SPONSORED_AD (src/lib/plans.ts).
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
  /** Top: always first in its city (SPONSORED_AD.topPerCity at once); Standard: shares the rest by rotation */
  tier: AdTier;
  /** The business's city when it asked (Organization.city); an ad without one is shown everywhere */
  city?: string;
  price: number;
  /** How many times it was shown on screen, and tapped (POST /api/sponsored/track) */
  views: number;
  taps: number;
  /** How the business says it paid: transaction ID, sender number and so on */
  paymentRef: string;
  note?: string;
  status: AdStatus;
  startsAt?: Date;
  endsAt?: Date;
  /** Reminders already sent (1 = the day before, 0 = ended) for reminderFor (src/lib/expiryReminders.ts) */
  reminderFor?: Date;
  remindersSent?: number[];
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
    tier: { type: String, enum: ["STANDARD", "TOP"], default: "STANDARD" },
    city: { type: String, trim: true, maxlength: 80 },
    price: { type: Number, required: true, min: 0 },
    views: { type: Number, default: 0 },
    taps: { type: Number, default: 0 },
    paymentRef: { type: String, required: true, trim: true, maxlength: 200 },
    note: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ["REQUESTED", "APPROVED", "REJECTED", "CANCELLED", "STOPPED"], default: "REQUESTED", index: true },
    startsAt: Date,
    endsAt: Date,
    // Reminders already sent for this end date (src/lib/expiryReminders.ts)
    reminderFor: { type: Date },
    remindersSent: { type: [Number], default: undefined },
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
