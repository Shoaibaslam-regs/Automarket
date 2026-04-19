import mongoose, { Schema, Document } from "mongoose";

export interface IRental extends Document {
  listingId: mongoose.Types.ObjectId;
  dailyRate: number;
  weeklyRate?: number;
  monthlyRate?: number;
  deposit: number;
  availableFrom: Date;
  availableTo?: Date;
  ownerId: mongoose.Types.ObjectId;
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
  },
  { timestamps: true }
);

export const Rental =
  mongoose.models.Rental || mongoose.model<IRental>("Rental", RentalSchema);