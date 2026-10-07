import mongoose, { Schema, Document } from "mongoose";

export interface IFavorite extends Document {
  userId: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const FavoriteSchema = new Schema<IFavorite>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One save per user per listing; also serves "my saved listings, newest first"
FavoriteSchema.index({ userId: 1, listingId: 1 }, { unique: true });
FavoriteSchema.index({ userId: 1, createdAt: -1 });

export const Favorite =
  mongoose.models.Favorite || mongoose.model<IFavorite>("Favorite", FavoriteSchema);
