import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/**
 * Someone following a business's shop page (src/lib/shopFollowServer.ts): its new deals, announcements and vehicles
 * reach them as notifications. `muted` keeps the shop in their list without notifying them.
 */
export interface IShopFollow extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  muted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShopFollowSchema = new Schema<IShopFollow>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    muted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ShopFollowSchema.index({ userId: 1, organizationId: 1 }, { unique: true });
// The followers of one shop (counts, notifications), unmuted first
ShopFollowSchema.index({ organizationId: 1, muted: 1, createdAt: -1 });

export const ShopFollow = defineModel<IShopFollow>("ShopFollow", ShopFollowSchema);
