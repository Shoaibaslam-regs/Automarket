import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/**
 * A direct purchase of a business's vehicle: an online buyer's request, or a walk-in sale the business records.
 * Flow: REQUESTED → ACCEPTED (price agreed) → COMPLETED (sold), or DECLINED / CANCELLED (see src/lib/purchases.ts).
 */
export interface IPurchase extends Document {
  /** The selling business; every purchase belongs to one */
  organizationId: mongoose.Types.ObjectId;
  /** What was bought: a for-sale listing, a sale deal, or neither for a vehicle the business never listed */
  listingId?: mongoose.Types.ObjectId;
  dealId?: mongoose.Types.ObjectId;
  /** Snapshot of the vehicle when the request was made, so records survive edits and deletes */
  vehicle: { title: string; make?: string; model?: string; year?: number; image?: string };
  /** The AutoMarket user who asked to buy; absent for walk-in sales */
  buyerId?: mongoose.Types.ObjectId;
  /** Buyer's details as given (always stored, also for online buyers) */
  buyer: { name: string; phone: string; email?: string; cnic?: string };
  source: "ONLINE" | "WALK_IN";
  /** Listed price at the time of the request */
  askingPrice: number;
  /** Buyer's offer, when they offered less than the asking price */
  offerPrice?: number;
  /** Final price, set when the business accepts or records the sale */
  agreedPrice?: number;
  /** What the buyer has paid so far (the payment tag comes from it) */
  amountPaid?: number;
  /** Registration number of the vehicle handed over, printed on the slip */
  plateNumber?: string;
  /** Buyer's note with the request */
  message?: string;
  /** The business's internal notes */
  notes?: string;
  declineReason?: string;
  status: "REQUESTED" | "ACCEPTED" | "COMPLETED" | "DECLINED" | "CANCELLED";
  /** CRM customer of the business this purchase is linked to */
  customerId?: mongoose.Types.ObjectId;
  /** Team member who recorded a walk-in sale, or last moved the purchase along */
  createdBy?: mongoose.Types.ObjectId;
  handledBy?: mongoose.Types.ObjectId;
  /** False while the buyer has an update (accepted, declined, sold) they haven't opened */
  seenByBuyer: boolean;
  acceptedAt?: Date;
  completedAt?: Date;
  declinedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseSchema = new Schema<IPurchase>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", index: true },
    dealId: { type: Schema.Types.ObjectId, ref: "Deal", index: true },
    vehicle: {
      type: new Schema(
        {
          title: { type: String, required: true, trim: true, maxlength: 120 },
          make: String,
          model: String,
          year: Number,
          image: String,
        },
        { _id: false }
      ),
      required: true,
    },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    buyer: {
      type: new Schema(
        {
          name: { type: String, required: true, trim: true, maxlength: 80 },
          phone: { type: String, required: true, trim: true, maxlength: 30 },
          email: { type: String, trim: true, maxlength: 120 },
          cnic: { type: String, trim: true, maxlength: 15 },
        },
        { _id: false }
      ),
      required: true,
    },
    source: { type: String, enum: ["ONLINE", "WALK_IN"], default: "ONLINE" },
    askingPrice: { type: Number, required: true, min: 0 },
    offerPrice: { type: Number, min: 0 },
    agreedPrice: { type: Number, min: 0 },
    amountPaid: { type: Number, min: 0 },
    plateNumber: { type: String, trim: true, maxlength: 20 },
    message: { type: String, trim: true, maxlength: 1000 },
    notes: { type: String, trim: true, maxlength: 1000 },
    declineReason: { type: String, trim: true, maxlength: 300 },
    status: { type: String, enum: ["REQUESTED", "ACCEPTED", "COMPLETED", "DECLINED", "CANCELLED"], default: "REQUESTED", index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    handledBy: { type: Schema.Types.ObjectId, ref: "User" },
    seenByBuyer: { type: Boolean, default: true },
    acceptedAt: Date,
    completedAt: Date,
    declinedAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true }
);

PurchaseSchema.index({ organizationId: 1, createdAt: -1 });

export const Purchase = defineModel<IPurchase>("Purchase", PurchaseSchema);
