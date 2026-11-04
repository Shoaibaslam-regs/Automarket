 import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

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
  /** Where buyers or renters see / collect the vehicle (shop or home address); optional */
  address?: string;
  images: string[];
  status: "ACTIVE" | "SOLD" | "RENTED" | "PENDING" | "INACTIVE";
  /** When the owner last marked it available, sold or rented; sold and rented listings stay visible (tagged) for a while after this */
  statusChangedAt?: Date;
  removedByAdmin?: boolean;
  /** Hidden automatically after REPORTS_TO_HIDE people reported it (src/lib/reportAutoHide.ts); dismissing the reports brings it back */
  autoHiddenAt?: Date;
  featured: boolean;
  /** Boosted to the top of matching Marketplace results until then (src/lib/boosts.ts) */
  boostedUntil?: Date;
  /** Pinned first on its business's shop page (Premium Plus and up) */
  pinnedAt?: Date;
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
    address: { type: String, trim: true, maxlength: 200 },
    images: [{ type: String }],
    status: {
      type: String,
      enum: ["ACTIVE", "SOLD", "RENTED", "PENDING", "INACTIVE"],
      default: "ACTIVE",
    },
    statusChangedAt: { type: Date },
    /** Taken down by an admin (status INACTIVE or PENDING from the admin Listings page): the seller can't switch it back on */
    removedByAdmin: { type: Boolean },
    autoHiddenAt: { type: Date },
    // No longer read or set: the admin "Feature" switch was replaced by business boosts (boostedUntil). Kept so old
    // documents still load.
    featured: { type: Boolean, default: false },
    boostedUntil: { type: Date },
    pinnedAt: { type: Date },
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
// Browse and the home page (status first, then newest), and each seller's or team's vehicles. (The old
// { status, featured, createdAt } index is no longer used; it can be dropped in Atlas.)
ListingSchema.index({ status: 1, createdAt: -1 });
// Boosted vehicles still running, for the top of Marketplace
ListingSchema.index({ boostedUntil: 1 }, { partialFilterExpression: { boostedUntil: { $exists: true } } });
ListingSchema.index({ status: 1, type: 1, createdAt: -1 });
ListingSchema.index({ sellerId: 1, createdAt: -1 });

export const Listing = defineModel<IListing>("Listing", ListingSchema);