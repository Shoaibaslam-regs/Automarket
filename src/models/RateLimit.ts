import { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/**
 * One counter per rate-limit key and time window (see src/lib/rateLimit.ts).
 * MongoDB deletes each document once its window has passed (TTL index on expiresAt).
 */
export interface IRateLimit extends Document {
  key: string;
  count: number;
  expiresAt: Date;
}

const RateLimitSchema = new Schema<IRateLimit>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});

RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit = defineModel<IRateLimit>("RateLimit", RateLimitSchema);
