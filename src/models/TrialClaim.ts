import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/**
 * A verified phone number that has had the free trial. Kept even when the account is deleted, so deleting
 * an account and signing up again with the same number doesn't give a second trial.
 */
export interface ITrialClaim extends Document {
  phone: string;
  userId: mongoose.Types.ObjectId;
  email: string;
  claimedAt: Date;
}

const TrialClaimSchema = new Schema<ITrialClaim>({
  phone: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, required: true },
  email: { type: String, required: true },
  claimedAt: { type: Date, default: Date.now },
});

export const TrialClaim = defineModel<ITrialClaim>("TrialClaim", TrialClaimSchema);
