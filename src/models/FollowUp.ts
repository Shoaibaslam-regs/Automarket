import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/** A reminder to call or message a CRM customer on a given day ("call Ahmed on Friday about the Civic"). */
export interface IFollowUp extends Document {
  organizationId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  /** Copied so the reminder reads well even if the customer is renamed */
  customerName: string;
  customerPhone?: string;
  dueAt: Date;
  note: string;
  doneAt?: Date;
  doneBy?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const FollowUpSchema = new Schema<IFollowUp>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: String,
    dueAt: { type: Date, required: true },
    note: { type: String, required: true, trim: true, maxlength: 300 },
    doneAt: Date,
    doneBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

FollowUpSchema.index({ organizationId: 1, doneAt: 1, dueAt: 1 });

export const FollowUp = defineModel<IFollowUp>("FollowUp", FollowUpSchema);
