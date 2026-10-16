import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/**
 * A phone verification code waiting to be entered. Only a hash of the code is stored; the document
 * expires with the code (TTL index) and is deleted once used. One per user at a time.
 */
export interface IPhoneOtp extends Document {
  userId: mongoose.Types.ObjectId;
  /** E.164, e.g. +923001234567 */
  phone: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
}

const PhoneOtpSchema = new Schema<IPhoneOtp>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  phone: { type: String, required: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});

PhoneOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PhoneOtp = defineModel<IPhoneOtp>("PhoneOtp", PhoneOtpSchema);
