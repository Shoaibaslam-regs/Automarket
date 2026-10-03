import mongoose, { Schema, Document } from "mongoose";

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
  },
  { timestamps: true }
);

CustomerSchema.index({ organizationId: 1, status: 1 });
CustomerSchema.index({ organizationId: 1, phone: 1 });

export const Customer =
  mongoose.models.Customer ||
  mongoose.model<ICustomer>("Customer", CustomerSchema);
