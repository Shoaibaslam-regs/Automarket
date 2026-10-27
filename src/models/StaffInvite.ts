import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/**
 * An invitation to join a business's team. Nothing about the invited account changes until they accept
 * (POST /api/invites/[id]): adding someone straight away let a business take in any user by email, which put
 * their own listings and rental bookings into the business console without their consent.
 * Expires after 14 days (TTL); one open invitation per person per business.
 */
export interface IStaffInvite extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: "MANAGER" | "SALES" | "STAFF";
  invitedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

export const STAFF_INVITE_DAYS = 14;

const StaffInviteSchema = new Schema<IStaffInvite>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["MANAGER", "SALES", "STAFF"], required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

StaffInviteSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
StaffInviteSchema.index({ createdAt: 1 }, { expireAfterSeconds: STAFF_INVITE_DAYS * 24 * 60 * 60 });

export const StaffInvite = defineModel<IStaffInvite>("StaffInvite", StaffInviteSchema);
