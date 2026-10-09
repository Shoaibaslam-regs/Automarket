import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";
import { PLAN_IDS, type PlanId } from "../lib/plans";

export interface IUser extends Document {
  name?: string;
  email: string;
  emailVerified?: Date;
  image?: string;
  password?: string;
  phone?: string;
  role: "USER" | "SELLER" | "ADMIN";
  organizationId?: mongoose.Types.ObjectId;
  organizationRole?: "OWNER" | "MANAGER" | "SALES" | "STAFF";
  /** Only meaningful for ADMIN. Missing is treated as FULL so admins created before this field keep their access. */
  adminAccess?: "FULL" | "READ_ONLY";
  plan: PlanId;
  planExpiresAt?: Date;
  /** How the current paid plan was obtained; ADMIN_GRANT is a free upgrade given from the admin panel */
  planSource?: "PAID" | "ADMIN_GRANT";
  planGrantedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true },
    emailVerified: { type: Date },
    image: { type: String },
    password: { type: String },
    phone: { type: String },
    role: { type: String, enum: ["USER", "SELLER", "ADMIN"], default: "USER" },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
    organizationRole: { type: String, enum: ["OWNER", "MANAGER", "SALES", "STAFF"] },
    adminAccess: { type: String, enum: ["FULL", "READ_ONLY"] },
    plan: { type: String, enum: PLAN_IDS, default: "FREE" },
    planExpiresAt: { type: Date },
    planSource: { type: String, enum: ["PAID", "ADMIN_GRANT"] },
    planGrantedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const User = defineModel<IUser>("User", UserSchema);
