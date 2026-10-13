import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

export interface IRental extends Document {
  listingId: mongoose.Types.ObjectId;
  dailyRate: number;
  weeklyRate?: number;
  monthlyRate?: number;
  deposit: number;
  availableFrom: Date;
  availableTo?: Date;
  ownerId: mongoose.Types.ObjectId;
  /** Last number plate entered at a handover, used to prefill the next one */
  plateNumber?: string;
  createdAt: Date;
}

const RentalSchema = new Schema<IRental>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true, unique: true },
    dailyRate: { type: Number, required: true },
    weeklyRate: { type: Number },
    monthlyRate: { type: Number },
    deposit: { type: Number, required: true },
    availableFrom: { type: Date, required: true },
    availableTo: { type: Date },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    plateNumber: { type: String, trim: true, maxlength: 20 },
  },
  { timestamps: true }
);

export const Rental = defineModel<IRental>("Rental", RentalSchema);