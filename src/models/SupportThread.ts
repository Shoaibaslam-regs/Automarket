import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/**
 * The team's state for one person's conversation with AutoGO Support (Admin → Support inbox): who took it and when it
 * was last marked done. The messages themselves are ordinary `Message`s to or from the support account. A conversation
 * is open when the person wrote after `doneAt` (or it was never done); replying marks it done.
 */
export interface ISupportThread extends Document {
  userId: mongoose.Types.ObjectId;
  takenBy?: mongoose.Types.ObjectId;
  takenAt?: Date;
  doneAt?: Date;
  doneBy?: mongoose.Types.ObjectId;
}

const SupportThreadSchema = new Schema<ISupportThread>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    takenBy: { type: Schema.Types.ObjectId, ref: "User" },
    takenAt: Date,
    doneAt: Date,
    doneBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const SupportThread = defineModel<ISupportThread>("SupportThread", SupportThreadSchema);
