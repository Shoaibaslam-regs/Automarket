import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";
import { PLAN_IDS, type PlanId, type PlanSource } from "../lib/plans";
import { normalizePkMobile } from "../lib/phone";

export interface IUser extends Document {
  name?: string;
  email: string;
  emailVerified?: Date;
  /** Set on new email sign-ups until the link in the confirmation email is opened; sign-in is refused while true */
  emailVerifyRequired?: boolean;
  emailVerifyTokenHash?: string;
  emailVerifyExpires?: Date;
  /** Random key every session carries; replacing it (password change, reset, role change) signs out other devices */
  sessionKey?: string;
  /** The 6-digit sign-up code (hash only), when it expires, wrong guesses so far and where it was sent */
  signupCodeHash?: string;
  signupCodeExpires?: Date;
  signupCodeTries?: number;
  signupCodeChannel?: "email" | "phone";
  image?: string;
  password?: string;
  phone?: string;
  role: "USER" | "SELLER" | "ADMIN";
  organizationId?: mongoose.Types.ObjectId;
  organizationRole?: "OWNER" | "MANAGER" | "SALES" | "STAFF";
  /** Only meaningful for ADMIN. Missing is treated as FULL so admins created before this field keep their access. */
  /** FULL or MANAGER (src/lib/adminRoles.ts); READ_ONLY is the old view-only level, read as MANAGER */
  adminAccess?: "FULL" | "MANAGER" | "READ_ONLY";
  /** The shared "AutoGO Support" account (src/lib/supportAccount.ts): it can't sign in; admins write as it from the Support inbox */
  isSupportAccount?: boolean;
  /** Banned by an admin (src/app/api/admin/users/[id]/ban): can't sign in; `banListingIds` are the live listings it hid */
  bannedAt?: Date;
  banReason?: string;
  bannedBy?: mongoose.Types.ObjectId;
  banListingIds?: mongoose.Types.ObjectId[];
  /** When the last sign-up code was sent and how many in a row, for the growing resend wait (src/lib/resendWait.ts) */
  signupCodeSentAt?: Date;
  signupCodeSends?: number;
  /** The same for admin sign-in codes */
  adminCodeSentAt?: Date;
  adminCodeSends?: number;
  /** SHA-256 of this admin's personal key for the hidden admin entry on /login (src/lib/adminPersonalKey.ts) */
  adminKeyHash?: string;
  adminKeyCreatedAt?: Date;
  /** The 6-digit admin sign-in code: only sha256(userId:code), its expiry and wrong tries (src/lib/adminCode.ts) */
  adminCodeHash?: string;
  adminCodeExpires?: Date;
  adminCodeTries?: number;
  plan: PlanId;
  planExpiresAt?: Date;
  /** How the current paid plan was obtained: ADMIN_GRANT is a gift from the admin panel, TRIAL the one-time free trial */
  planSource?: PlanSource;
  /** When the account's one free trial was started; set once and never cleared, so it can't be given again */
  trialUsedAt?: Date;
  /** The planExpiresAt the "plan ends soon" reminder was sent for (daily cron), so each period is reminded once */
  planReminderFor?: Date;
  /** Profile picture changes made, and when the last one was (src/lib/profilePicture.ts sets the waits) */
  pictureChanges?: number;
  pictureChangedAt?: Date;
  /** Forgot-password link: only a SHA-256 hash of the token is stored, and it expires (see /api/auth/forgot-password) */
  /** The profile phone as E.164 (+92…), kept in step with `phone` on save; it signs in with the password, unverified */
  loginPhone?: string;
  /** Mobile number confirmed by SMS code (E.164, +92…), and when; cleared if the profile phone changes */
  verifiedPhone?: string;
  phoneVerifiedAt?: Date;
  /** The verified phone the free trial was given to, so the same number can't get another trial on a new account */
  trialPhone?: string;
  /** Last time this user opened Business → Updates; newer official posts count as unread */
  officialSeenAt?: Date;
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
    emailVerifyRequired: { type: Boolean },
    emailVerifyTokenHash: { type: String, index: true, sparse: true },
    emailVerifyExpires: { type: Date },
    sessionKey: { type: String },
    signupCodeHash: { type: String },
    signupCodeExpires: { type: Date },
    signupCodeTries: { type: Number },
    signupCodeChannel: { type: String, enum: ["email", "phone"] },
    image: { type: String },
    password: { type: String },
    phone: { type: String },
    role: { type: String, enum: ["USER", "SELLER", "ADMIN"], default: "USER" },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
    organizationRole: { type: String, enum: ["OWNER", "MANAGER", "SALES", "STAFF"] },
    adminAccess: { type: String, enum: ["FULL", "MANAGER", "READ_ONLY"] },
    isSupportAccount: { type: Boolean, index: { sparse: true } },
    bannedAt: { type: Date },
    banReason: { type: String, maxlength: 500 },
    bannedBy: { type: Schema.Types.ObjectId, ref: "User" },
    banListingIds: [{ type: Schema.Types.ObjectId, ref: "Listing" }],
    signupCodeSentAt: { type: Date },
    signupCodeSends: { type: Number },
    adminCodeSentAt: { type: Date },
    adminCodeSends: { type: Number },
    adminKeyHash: { type: String, index: { unique: true, sparse: true } },
    adminKeyCreatedAt: { type: Date },
    adminCodeHash: { type: String },
    adminCodeExpires: { type: Date },
    adminCodeTries: { type: Number },
    plan: { type: String, enum: PLAN_IDS, default: "FREE" },
    planExpiresAt: { type: Date },
    planSource: { type: String, enum: ["PAID", "ADMIN_GRANT", "TRIAL"] },
    trialUsedAt: { type: Date },
    planReminderFor: { type: Date },
    pictureChanges: { type: Number, default: 0 },
    pictureChangedAt: { type: Date },
    loginPhone: { type: String, index: true, sparse: true },
    verifiedPhone: { type: String, index: true, sparse: true },
    phoneVerifiedAt: { type: Date },
    trialPhone: { type: String, index: true, sparse: true },
    officialSeenAt: { type: Date },
    resetTokenHash: { type: String, index: true, sparse: true },
    resetTokenExpires: { type: Date },
    trialPlan: { type: String, enum: PLAN_IDS },
    planGrantedBy: { type: Schema.Types.ObjectId, ref: "User" },
    termsAcceptedAt: { type: Date },
  },
  { timestamps: true }
);

// Sign-in by phone looks accounts up by loginPhone, so it follows every saved change of the profile phone
UserSchema.pre("save", function () {
  if (this.isModified("phone")) this.loginPhone = normalizePkMobile(this.phone) ?? undefined;
});

export const User = defineModel<IUser>("User", UserSchema);
