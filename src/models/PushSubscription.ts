import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/**
 * One phone or browser that agreed to receive push notifications for a user (Web Push).
 * The endpoint is unique: if another person signs in on the same phone and turns alerts on, it moves to them.
 */
export interface IPushSubscription extends Document {
  userId: mongoose.Types.ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
  lastSentAt?: Date;
  createdAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      type: new Schema({ p256dh: { type: String, required: true }, auth: { type: String, required: true } }, { _id: false }),
      required: true,
    },
    userAgent: { type: String, maxlength: 300 },
    lastSentAt: Date,
  },
  { timestamps: true }
);

export const PushSubscription = defineModel<IPushSubscription>("PushSubscription", PushSubscriptionSchema);
