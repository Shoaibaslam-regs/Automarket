import { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/**
 * One counter per account per quota month (src/lib/quotaCounter.ts): how many slots of a monthly allowance have been
 * taken, raised only while below the limit, so requests sent at the same moment can never pass it together.
 * `key` is e.g. "listings:org:<id>:2026-11" or "boosts:user:<id>:2026-11". Removed after the month by a TTL index.
 */
export interface IQuotaCounter extends Document {
  key: string;
  count: number;
  expiresAt: Date;
}

const QuotaCounterSchema = new Schema<IQuotaCounter>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
});

QuotaCounterSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const QuotaCounter = defineModel<IQuotaCounter>("QuotaCounter", QuotaCounterSchema);
