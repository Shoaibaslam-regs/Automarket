 import mongoose, { Schema, Document } from "mongoose";

export interface IListing extends Omit<Document, "model"> {
  title: string;
  description: string;
  price: number;
  type: "SALE" | "RENT" | "BOTH";
  condition: "NEW" | "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
  make: string;
  model: string;
  year: number;
  mileage?: number;
  color?: string;
  fuelType?: string;
  transmission?: string;
  location: string;
  images: string[];
  status: "ACTIVE" | "SOLD" | "RENTED" | "PENDING" | "INACTIVE";
  featured: boolean;
  sellerId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ListingSchema = new Schema<IListing>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    type: { type: String, enum: ["SALE", "RENT", "BOTH"], required: true },
    condition: {
      type: String,
      enum: ["NEW", "EXCELLENT", "GOOD", "FAIR", "POOR"],
      required: true,
    },
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    mileage: { type: Number },
    color: { type: String },
    fuelType: { type: String },
    transmission: { type: String },
    location: { type: String, required: true },
    images: [{ type: String }],
    status: {
      type: String,
      enum: ["ACTIVE", "SOLD", "RENTED", "PENDING", "INACTIVE"],
      default: "ACTIVE",
    },
    featured: { type: Boolean, default: false },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ListingSchema.index({
  make: "text",
  model: "text",
  title: "text",
  location: "text",
});

export const Listing =
  mongoose.models.Listing || mongoose.model<IListing>("Listing", ListingSchema);