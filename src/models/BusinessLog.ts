import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

export type BusinessLogTarget = "BOOKING" | "SALE" | "CUSTOMER" | "DEAL" | "LISTING" | "STAFF" | "MONEY" | "BUSINESS" | "REVIEW";

/**
 * One action by a business team member (who did what, to what, when). Written by logBusinessAction
 * (src/lib/businessLog.ts); the owner reads it at Staff → Activity, and Staff → Performance counts it.
 */
export interface IBusinessLog extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  /** Copied so the log stays readable after a member leaves or is deleted */
  userName: string;
  /** e.g. "booking.handover", "sale.complete" (see BUSINESS_ACTION_LABEL) */
  action: string;
  targetType: BusinessLogTarget;
  targetId?: mongoose.Types.ObjectId;
  targetLabel?: string;
  details?: string;
  /** Money involved, for performance totals (e.g. a sale's price or a payment received) */
  amount?: number;
  createdAt: Date;
}

const BusinessLogSchema = new Schema<IBusinessLog>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId },
    targetLabel: { type: String, maxlength: 200 },
    details: { type: String, maxlength: 500 },
    amount: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

BusinessLogSchema.index({ organizationId: 1, createdAt: -1 });
BusinessLogSchema.index({ organizationId: 1, userId: 1, createdAt: -1 });

export const BusinessLog = defineModel<IBusinessLog>("BusinessLog", BusinessLogSchema);
