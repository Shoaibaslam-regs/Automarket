import { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/** Brent and WTI daily closes from Alpha Vantage, one per commodity per market day, for the trend charts. */
export interface IOilPriceHistory extends Document {
  commodity: "BRENT" | "WTI";
  /** The market day, "YYYY-MM-DD" */
  date: string;
  price: number;
  marketTimestamp?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OilPriceHistorySchema = new Schema<IOilPriceHistory>(
  {
    commodity: { type: String, enum: ["BRENT", "WTI"], required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    price: { type: Number, required: true },
    marketTimestamp: { type: Date },
  },
  { timestamps: true }
);

OilPriceHistorySchema.index({ commodity: 1, date: -1 }, { unique: true });

export const OilPriceHistory = defineModel<IOilPriceHistory>("OilPriceHistory", OilPriceHistorySchema);
