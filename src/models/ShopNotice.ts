import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/**
 * A business's own announcement on its shop page (news, an event, an offer, an important notice), from
 * Business → Announcements (src/lib/shopNotices.ts). It leaves the shop page after endsAt, and MongoDB deletes it
 * 30 days after that.
 */
export interface IShopNotice extends Document {
  organizationId: mongoose.Types.ObjectId;
  kind: "NEWS" | "EVENT" | "OFFER" | "NOTICE";
  title: string;
  body?: string;
  eventAt?: Date;
  endsAt: Date;
  link?: string;
  linkLabel?: string;
  pinned: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ShopNoticeSchema = new Schema<IShopNotice>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    kind: { type: String, enum: ["NEWS", "EVENT", "OFFER", "NOTICE"], required: true },
    title: { type: String, required: true, maxlength: 80 },
    body: { type: String, maxlength: 400 },
    eventAt: { type: Date },
    endsAt: { type: Date, required: true },
    link: { type: String, maxlength: 500 },
    linkLabel: { type: String, maxlength: 30 },
    pinned: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ShopNoticeSchema.index({ organizationId: 1, endsAt: -1 });
// Ended announcements are kept a month for the business's own list, then removed
ShopNoticeSchema.index({ endsAt: 1 }, { expireAfterSeconds: 30 * 86_400 });

export const ShopNotice = defineModel<IShopNotice>("ShopNotice", ShopNoticeSchema);
