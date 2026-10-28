import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

export type AdminLogTarget = "USER" | "BUSINESS" | "LISTING" | "DEAL" | "REPORT" | "ANNOUNCEMENT" | "AD" | "SETTINGS" | "REQUEST";

/**
 * One admin action: who did what to which account, business, listing, deal or report, and when.
 * Written by logAdminAction (src/lib/adminLog.ts); never edited or deleted by the app.
 */
export interface IAdminLog extends Document {
  adminId: mongoose.Types.ObjectId;
  /** Copied so the log stays readable after an admin account is deleted */
  adminEmail: string;
  adminName?: string;
  /** e.g. "user.delete", "business.suspend", "listing.update" (see ADMIN_ACTION_LABEL) */
  action: string;
  targetType: AdminLogTarget;
  targetId?: mongoose.Types.ObjectId;
  /** Name or title of the target at the time, so the entry survives the target being deleted */
  targetLabel?: string;
  /** Human-readable summary, e.g. "Gifted Premium for 3 months" or the suspension reason */
  details?: string;
  createdAt: Date;
}

const AdminLogSchema = new Schema<IAdminLog>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    adminEmail: { type: String, required: true },
    adminName: String,
    action: { type: String, required: true, index: true },
    targetType: { type: String, enum: ["USER", "BUSINESS", "LISTING", "DEAL", "REPORT", "ANNOUNCEMENT", "AD", "SETTINGS", "REQUEST"], required: true },
    targetId: { type: Schema.Types.ObjectId, index: true },
    targetLabel: { type: String, maxlength: 200 },
    details: { type: String, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AdminLogSchema.index({ createdAt: -1 });

export const AdminLog = defineModel<IAdminLog>("AdminLog", AdminLogSchema);
