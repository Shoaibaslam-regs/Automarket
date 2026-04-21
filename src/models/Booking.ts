import mongoose, { Schema, Document } from "mongoose";

export interface IBooking extends Document {
  rentalId: mongoose.Types.ObjectId;
  renterId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  deposit: number;
  status: "PENDING" | "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  seenByRenter: boolean;
  deletedByOwner: boolean;
  deletedByRenter: boolean;
  confirmedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    rentalId: { type: Schema.Types.ObjectId, ref: "Rental", required: true },
    renterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalAmount: { type: Number, required: true },
    deposit: { type: Number, required: true },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED"],
      default: "PENDING",
    },
    seenByRenter: { type: Boolean, default: false },
    deletedByOwner: { type: Boolean, default: false },
    deletedByRenter: { type: Boolean, default: false },
    confirmedAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

export const Booking =
  mongoose.models.Booking ||
  mongoose.model<IBooking>("Booking", BookingSchema);
