import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/** A customer's review of a business (dealer or rental company), shown on its public profile. */
export interface IBusinessReview extends Document {
  organizationId: mongoose.Types.ObjectId;
  reviewerId: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  /** The business's public reply */
  reply?: { text: string; repliedBy: mongoose.Types.ObjectId; repliedAt: Date };
  createdAt: Date;
  updatedAt: Date;
}

const BusinessReviewSchema = new Schema<IBusinessReview>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 1000 },
    reply: {
      type: new Schema(
        {
          text: { type: String, required: true, trim: true, maxlength: 1000 },
          repliedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
          repliedAt: { type: Date, required: true },
        },
        { _id: false }
      ),
    },
  },
  { timestamps: true }
);

// One review per customer per business (editing replaces it)
BusinessReviewSchema.index({ organizationId: 1, reviewerId: 1 }, { unique: true });
BusinessReviewSchema.index({ organizationId: 1, createdAt: -1 });

export const BusinessReview = defineModel<IBusinessReview>("BusinessReview", BusinessReviewSchema);
