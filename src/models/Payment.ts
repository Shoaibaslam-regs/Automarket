import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId;
  listingId?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  amount: number;
  platformFee: number;
  sellerAmount: number;
  currency: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REFUNDED";
  stripePaymentId?: string;
  type: "PURCHASE" | "RENTAL_BOOKING" | "DEPOSIT";
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    listingId: { type: Schema.Types.ObjectId, ref: "Listing" },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    amount: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    sellerAmount: { type: Number, required: true },
    currency: { type: String, default: "usd" },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "REFUNDED"],
      default: "PENDING",
    },
    stripePaymentId: { type: String },
    type: {
      type: String,
      enum: ["PURCHASE", "RENTAL_BOOKING", "DEPOSIT"],
      required: true,
    },
  },
  { timestamps: true }
);

export const Payment =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);