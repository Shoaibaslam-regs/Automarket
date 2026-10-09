import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

export interface ICustomer extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  notes?: string;
  source: "WALK_IN" | "ONLINE" | "REFERRAL" | "PHONE" | "OTHER";
  status: "LEAD" | "INTERESTED" | "TEST_DRIVE" | "NEGOTIATING" | "SOLD" | "LOST";
  interestedIn?: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  /** Marked by the business as a star (VIP) customer */
  starred: boolean;
  /** Set when the customer has an AutoMarket account (online bookings, or added by email) */
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    city: { type: String },
    notes: { type: String },
    source: { type: String, enum: ["WALK_IN", "ONLINE", "REFERRAL", "PHONE", "OTHER"], default: "ONLINE" },
    status: { type: String, enum: ["LEAD", "INTERESTED", "TEST_DRIVE", "NEGOTIATING", "SOLD", "LOST"], default: "LEAD" },
    interestedIn: { type: Schema.Types.ObjectId, ref: "Listing" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    starred: { type: Boolean, default: false },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

CustomerSchema.index({ organizationId: 1, status: 1 });
CustomerSchema.index({ organizationId: 1, phone: 1 });
CustomerSchema.index({ organizationId: 1, userId: 1 });

export const Customer = defineModel<ICustomer>("Customer", CustomerSchema);
