import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

export interface IBooking extends Document {
  rentalId: mongoose.Types.ObjectId;
  /** The marketplace user who booked; absent for walk-in bookings made by a business */
  renterId?: mongoose.Types.ObjectId;
  source: "ONLINE" | "WALK_IN";
  /** Customer details for walk-in bookings, which have no AutoMarket account */
  walkIn?: { name: string; phone: string; email?: string; cnic?: string };
  /** Business CRM record this booking is for, when chosen */
  customerId?: mongoose.Types.ObjectId;
  /** Team member who created a walk-in booking */
  createdBy?: mongoose.Types.ObjectId;
  notes?: string;
  /** Registration number of the vehicle handed over, shown on the booking and slip */
  plateNumber?: string;
  /** Renter's CNIC, checked by the owner at handover; walk-ins may also have walkIn.cnic */
  renterCnic?: string;
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  deposit: number;
  status: "PENDING" | "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  seenByRenter: boolean;
  deletedByOwner: boolean;
  deletedByRenter: boolean;
  confirmedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    rentalId: { type: Schema.Types.ObjectId, ref: "Rental", required: true },
    renterId: { type: Schema.Types.ObjectId, ref: "User" },
    source: { type: String, enum: ["ONLINE", "WALK_IN"], default: "ONLINE" },
    walkIn: {
      type: new Schema({ name: { type: String, required: true }, phone: { type: String, required: true }, email: String, cnic: String }, { _id: false }),
    },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: { type: String },
    plateNumber: { type: String, trim: true, maxlength: 20 },
    renterCnic: { type: String, trim: true, maxlength: 15 },
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
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

export const Booking = defineModel<IBooking>("Booking", BookingSchema);
