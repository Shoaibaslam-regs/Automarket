import { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

export type ErrorSource = "SERVER" | "CLIENT";

/**
 * One kind of error seen in production, grouped by where it happened and its message (see reportError in
 * src/lib/errorLog.ts). Repeats only raise `count` and `lastSeenAt`. Entries untouched for 30 days are
 * deleted by MongoDB (TTL index), so the collection stays small.
 */
export interface IErrorLog extends Document {
  /** Hash of source + where + the message with numbers and ids blanked, so the same bug groups into one entry */
  fingerprint: string;
  source: ErrorSource;
  /** The label the code passed, e.g. "Create listing error", or the route file for uncaught errors */
  where: string;
  message: string;
  /** Stack of the latest occurrence */
  stack?: string;
  /** Path and method of the latest occurrence */
  path?: string;
  method?: string;
  /** Next.js error digest of the latest occurrence, matching the "Ref:" on the error page */
  digest?: string;
  count: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  /** Set when an admin marks it fixed; a new occurrence clears it */
  resolvedAt?: Date;
}

const ErrorLogSchema = new Schema<IErrorLog>({
  fingerprint: { type: String, required: true, unique: true },
  source: { type: String, enum: ["SERVER", "CLIENT"], required: true },
  where: { type: String, required: true, maxlength: 200 },
  message: { type: String, required: true, maxlength: 1000 },
  stack: { type: String, maxlength: 4000 },
  path: { type: String, maxlength: 300 },
  method: { type: String, maxlength: 10 },
  digest: { type: String, maxlength: 50 },
  count: { type: Number, default: 1 },
  firstSeenAt: { type: Date, required: true },
  lastSeenAt: { type: Date, required: true },
  resolvedAt: Date,
});

ErrorLogSchema.index({ lastSeenAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
ErrorLogSchema.index({ resolvedAt: 1, lastSeenAt: -1 });

export const ErrorLog = defineModel<IErrorLog>("ErrorLog", ErrorLogSchema);
