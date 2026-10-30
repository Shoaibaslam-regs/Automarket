import { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/**
 * How often a paid or limited outside service was used: one counter per service per Pakistan day
 * (src/lib/usageTracker.ts), shown on the admin System usage page. MongoDB deletes each one after expiresAt.
 */
export interface IUsageCount extends Document {
  service: "gemini" | "email";
  /** "YYYY-MM-DD" in Pakistan time */
  day: string;
  calls: number;
  failures: number;
  /** Gemini tokens (prompt and answer); 0 for email */
  tokens: number;
  expiresAt: Date;
}

const UsageCountSchema = new Schema<IUsageCount>({
  service: { type: String, enum: ["gemini", "email"], required: true },
  day: { type: String, required: true },
  calls: { type: Number, default: 0 },
  failures: { type: Number, default: 0 },
  tokens: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});

UsageCountSchema.index({ service: 1, day: 1 }, { unique: true });
UsageCountSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const UsageCount = defineModel<IUsageCount>("UsageCount", UsageCountSchema);
