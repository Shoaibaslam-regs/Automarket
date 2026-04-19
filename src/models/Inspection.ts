 import mongoose, { Schema, Document } from "mongoose";

export interface IInspection extends Omit<Document, "model"> {
  listingId: mongoose.Types.ObjectId;
  images: string[];
  make?: string;
  model?: string;
  year?: number;
  condition?: string;
  damageScore?: number;
  estimate?: number;
  reportUrl?: string;
  rawResponse?: object;
  createdAt: Date;
}

const InspectionSchema = new Schema<IInspection>(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      unique: true,
    },
    images: [{ type: String }],
    make: { type: String },
    model: { type: String },
    year: { type: Number },
    condition: { type: String },
    damageScore: { type: Number },
    estimate: { type: Number },
    reportUrl: { type: String },
    rawResponse: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Inspection =
  mongoose.models.Inspection ||
  mongoose.model<IInspection>("Inspection", InspectionSchema);