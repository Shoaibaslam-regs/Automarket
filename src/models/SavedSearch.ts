import mongoose, { Schema, Document } from "mongoose";
import type { ListingFilters } from "@/lib/listingFilters";

export interface ISavedSearch extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  filters: ListingFilters;
  /** Email the user when a new listing matches. */
  emailAlerts: boolean;
  lastNotifiedAt?: Date;
  createdAt: Date;
}

const SavedSearchSchema = new Schema<ISavedSearch>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    // Already validated by parseFilters before saving
    filters: { type: Schema.Types.Mixed, required: true, default: {} },
    emailAlerts: { type: Boolean, default: true },
    lastNotifiedAt: { type: Date },
  },
  { timestamps: true, minimize: false }
);

SavedSearchSchema.index({ emailAlerts: 1 });

export const SavedSearch =
  mongoose.models.SavedSearch || mongoose.model<ISavedSearch>("SavedSearch", SavedSearchSchema);
