import { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/** The latest Brent or WTI daily close from Alpha Vantage (one document per commodity, replaced on each successful fetch). */
export interface IOilMarketPrice extends Document {
  commodity: "BRENT" | "WTI";
  price: number;
  previousClose?: number;
  change?: number;
  percentChange?: number;
  currency: "USD";
  unit: "barrel";
  /** The trading day of that close (Alpha Vantage's date, at 00:00 UTC; a few days behind) */
  marketTimestamp: Date;
  source: string;
  symbol: string;
  createdAt: Date;
  updatedAt: Date;
}

const OilMarketPriceSchema = new Schema<IOilMarketPrice>(
  {
    commodity: { type: String, enum: ["BRENT", "WTI"], required: true, unique: true },
    price: { type: Number, required: true },
    previousClose: { type: Number },
    change: { type: Number },
    percentChange: { type: Number },
    currency: { type: String, default: "USD" },
    unit: { type: String, default: "barrel" },
    marketTimestamp: { type: Date, required: true },
    source: { type: String, default: "Alpha Vantage (U.S. EIA data)" },
    symbol: { type: String, required: true },
  },
  { timestamps: true }
);

export const OilMarketPrice = defineModel<IOilMarketPrice>("OilMarketPrice", OilMarketPriceSchema);
