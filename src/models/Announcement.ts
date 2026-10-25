import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/**
 * A post on the AutoGO Official channel, written by an admin. Businesses that follow the channel
 * (Organization.followsOfficial) see it in Business → Updates and get a live notification.
 */
export interface IAnnouncement extends Document {
  kind: "ANNOUNCEMENT" | "UPDATE" | "OFFER";
  title: string;
  body: string;
  /** Optional button: an AutoGO path ("/pricing") or an https link */
  link?: string;
  linkLabel?: string;
  /** Pinned posts stay at the top of the feed */
  pinned: boolean;
  /** Offers can end; expired ones stay in the feed marked as ended */
  endsAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    kind: { type: String, enum: ["ANNOUNCEMENT", "UPDATE", "OFFER"], default: "ANNOUNCEMENT" },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    link: { type: String, trim: true, maxlength: 500 },
    linkLabel: { type: String, trim: true, maxlength: 40 },
    pinned: { type: Boolean, default: false },
    endsAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

AnnouncementSchema.index({ pinned: -1, createdAt: -1 });

export const Announcement = defineModel<IAnnouncement>("Announcement", AnnouncementSchema);
