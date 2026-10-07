import mongoose, { Schema, Document } from "mongoose";

export interface IReview extends Document {
  sellerId: mongoose.Types.ObjectId;
  reviewerId: mongoose.Types.ObjectId;
  /** The listing the reviewer was dealing with, if any. */
  listingId?: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    listingId: { type: Schema.Types.ObjectId, ref: "Listing" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

// One review per reviewer per seller (editing replaces it)
ReviewSchema.index({ sellerId: 1, reviewerId: 1 }, { unique: true });
ReviewSchema.index({ sellerId: 1, createdAt: -1 });

export const Review =
  mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema);
