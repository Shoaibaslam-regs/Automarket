import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

export interface IOrganization extends Document {
  name: string;
  slug: string;
  type: "DEALER" | "RENTAL" | "BOTH";
  ownerId: mongoose.Types.ObjectId;
  logo?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  description?: string;
  plan: "FREE" | "PRO" | "BUSINESS";
  planExpiresAt?: Date;
  /** false while suspended by an admin */
  isActive: boolean;
  /** Follows the AutoGO Official channel (announcements, updates, offers in Business → Updates) */
  followsOfficial?: boolean;
  followedOfficialAt?: Date;
  suspension?: {
    reason: string;
    at: Date;
    by: mongoose.Types.ObjectId;
    /** Listings that were live when suspended; only these are switched back on at reinstatement */
    listingIds: mongoose.Types.ObjectId[];
  };
  /** Admin warnings, oldest first; an optional step before suspension */
  warnings: Array<{
    reason: string;
    at: Date;
    by: mongoose.Types.ObjectId;
    acknowledgedAt?: Date;
    acknowledgedBy?: mongoose.Types.ObjectId;
  }>;
  /**
   * Verified badge (see VERIFIED_BADGE in lib/plans). verifiedAt is set while granted; requestedAt marks an
   * open request from the owner and is cleared when an admin approves or rejects it.
   */
  verification?: {
    verifiedAt?: Date;
    expiresAt?: Date;
    source?: "PAID" | "ADMIN_GRANT";
    by?: mongoose.Types.ObjectId;
    requestedAt?: Date;
    requestedBy?: mongoose.Types.ObjectId;
    rejectedAt?: Date;
    rejectionReason?: string;
  };
  settings: {
    allowPublicListings: boolean;
    currency: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    type: { type: String, enum: ["DEALER", "RENTAL", "BOTH"], required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    logo: { type: String },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    city: { type: String },
    description: { type: String },
    plan: { type: String, enum: ["FREE", "PRO", "BUSINESS"], default: "FREE" },
    planExpiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    followsOfficial: { type: Boolean, default: false, index: true },
    followedOfficialAt: { type: Date },
    suspension: {
      type: new Schema(
        {
          reason: { type: String, required: true, maxlength: 500 },
          at: { type: Date, required: true },
          by: { type: Schema.Types.ObjectId, ref: "User", required: true },
          listingIds: { type: [{ type: Schema.Types.ObjectId, ref: "Listing" }], default: [] },
        },
        { _id: false }
      ),
    },
    warnings: {
      type: [
        new Schema(
          {
            reason: { type: String, required: true, maxlength: 500 },
            at: { type: Date, required: true },
            by: { type: Schema.Types.ObjectId, ref: "User", required: true },
            acknowledgedAt: { type: Date },
            acknowledgedBy: { type: Schema.Types.ObjectId, ref: "User" },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    verification: {
      type: new Schema(
        {
          verifiedAt: { type: Date },
          expiresAt: { type: Date },
          source: { type: String, enum: ["PAID", "ADMIN_GRANT"] },
          by: { type: Schema.Types.ObjectId, ref: "User" },
          requestedAt: { type: Date },
          requestedBy: { type: Schema.Types.ObjectId, ref: "User" },
          rejectedAt: { type: Date },
          rejectionReason: { type: String, maxlength: 500 },
        },
        { _id: false }
      ),
    },
    settings: {
      allowPublicListings: { type: Boolean, default: true },
      currency: { type: String, default: "PKR" },
    },
  },
  { timestamps: true }
);

export const Organization = defineModel<IOrganization>("Organization", OrganizationSchema);
