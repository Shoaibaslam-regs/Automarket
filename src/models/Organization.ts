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
  isActive: boolean;
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
    settings: {
      allowPublicListings: { type: Boolean, default: true },
      currency: { type: String, default: "PKR" },
    },
  },
  { timestamps: true }
);

export const Organization = defineModel<IOrganization>("Organization", OrganizationSchema);
