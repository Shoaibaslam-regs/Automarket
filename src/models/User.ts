import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";
import { PLAN_IDS, type PlanId, type PlanSource } from "../lib/plans";

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
  /** How the current paid plan was obtained: ADMIN_GRANT is a gift from the admin panel, TRIAL the one-time free trial */
  planSource?: PlanSource;
  /** When the account's one free trial was started; set once and never cleared, so it can't be given again */
  trialUsedAt?: Date;
  /** Forgot-password link: only a SHA-256 hash of the token is stored, and it expires (see /api/auth/forgot-password) */
  /** Mobile number confirmed by SMS code (E.164, +92…), and when; cleared if the profile phone changes */
  verifiedPhone?: string;
  phoneVerifiedAt?: Date;
  /** The verified phone the free trial was given to, so the same number can't get another trial on a new account */
  trialPhone?: string;
  resetTokenHash?: string;
  resetTokenExpires?: Date;
  trialPlan?: PlanId;
  planGrantedBy?: mongoose.Types.ObjectId;
  /** When the user agreed to the Terms & Conditions (at sign-up; Google sign-ups agree by continuing) */
  termsAcceptedAt?: Date;
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
    planSource: { type: String, enum: ["PAID", "ADMIN_GRANT", "TRIAL"] },
    trialUsedAt: { type: Date },
    verifiedPhone: { type: String, index: true, sparse: true },
    phoneVerifiedAt: { type: Date },
    trialPhone: { type: String, index: true, sparse: true },
    resetTokenHash: { type: String, index: true, sparse: true },
    resetTokenExpires: { type: Date },
    trialPlan: { type: String, enum: PLAN_IDS },
    planGrantedBy: { type: Schema.Types.ObjectId, ref: "User" },
    termsAcceptedAt: { type: Date },
  },
  { timestamps: true }
);

export const User = defineModel<IUser>("User", UserSchema);
