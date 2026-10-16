import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

export type ReportTarget = "LISTING" | "DEAL" | "BUSINESS";

/**
 * A user's report about a listing, deal or business (scam, fake, wrong details and so on), reviewed by admins at /admin/reports.
 * Reasons and labels are in src/lib/reports.ts.
 */
export interface IReport extends Document {
  targetType: ReportTarget;
  targetId: mongoose.Types.ObjectId;
  /** Title or name at the time of the report, so it stays readable if the target is deleted */
  targetLabel: string;
  /** The business behind the target, when there is one */
  organizationId?: mongoose.Types.ObjectId;
  reporterId: mongoose.Types.ObjectId;
  reason: string;
  details?: string;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  /** The admin's note on what was done */
  resolution?: string;
  handledBy?: mongoose.Types.ObjectId;
  handledAt?: Date;
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    targetType: { type: String, enum: ["LISTING", "DEAL", "BUSINESS"], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    targetLabel: { type: String, required: true, maxlength: 200 },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reason: { type: String, required: true },
    details: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: ["OPEN", "RESOLVED", "DISMISSED"], default: "OPEN", index: true },
    resolution: { type: String, trim: true, maxlength: 500 },
    handledBy: { type: Schema.Types.ObjectId, ref: "User" },
    handledAt: Date,
  },
  { timestamps: true }
);

ReportSchema.index({ status: 1, createdAt: -1 });

export const Report = defineModel<IReport>("Report", ReportSchema);
