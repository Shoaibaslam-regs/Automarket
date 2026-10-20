import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

export interface IBooking extends Document {
  /** The rental listing booked; absent for deal bookings */
  rentalId?: mongoose.Types.ObjectId;
  /** Set when a rent deal (package) was booked instead of a rental listing; shown with a DEAL tag */
  dealId?: mongoose.Types.ObjectId;
  /**
   * A walk-in booking for a vehicle that isn't listed on AutoMarket (typed in by the business).
   * Such bookings have no rental or deal, so they carry the business in `organizationId`.
   */
  offListVehicle?: { title: string; dailyRate: number; deposit: number };
  /** The business, for bookings that have no rental or deal to link them to it (off-list walk-ins) */
  organizationId?: mongoose.Types.ObjectId;
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
  /** Exact return time the owner gave the renter at handover; late fees count from here (see lateCharge) */
  dueBackAt?: Date;
  /** When the vehicle actually came back (recorded with "Mark returned") */
  returnedAt?: Date;
  /** Extra days charged for a late return, and their fee (at the double daily rate) */
  lateDays?: number;
  lateFee?: number;
  /** Condition when handed over and when returned (odometer, fuel, notes, photos); see src/lib/checklist.ts */
  checkOut?: { odometer?: number; fuel?: string; notes?: string; photos?: string[] };
  checkIn?: { odometer?: number; fuel?: string; notes?: string; photos?: string[] };
  /** Extra charges added at return (fuel, damage, extra km); part of the amount due */
  extraCharges?: number;
  extraChargesNote?: string;
  /** Security deposit settled after the return: how much went back to the renter (the rest was kept) */
  depositRefunded?: number;
  depositNote?: string;
  depositSettledAt?: Date;
  /** How much the renter has paid so far, recorded by the owner; the payment tag comes from it (src/lib/payments.ts) */
  amountPaid?: number;
  paymentUpdatedAt?: Date;
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
    rentalId: {
      type: Schema.Types.ObjectId,
      ref: "Rental",
      required: function (this: { dealId?: unknown; offListVehicle?: unknown }) { return !this.dealId && !this.offListVehicle; },
    },
    dealId: { type: Schema.Types.ObjectId, ref: "Deal", index: true },
    offListVehicle: {
      type: new Schema(
        {
          title: { type: String, required: true, trim: true, maxlength: 100 },
          dailyRate: { type: Number, required: true, min: 0 },
          deposit: { type: Number, default: 0, min: 0 },
        },
        { _id: false }
      ),
    },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
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
    dueBackAt: { type: Date },
    returnedAt: { type: Date },
    lateDays: { type: Number, min: 0 },
    lateFee: { type: Number, min: 0 },
    checkOut: { type: new Schema({ odometer: Number, fuel: String, notes: String, photos: [String] }, { _id: false }) },
    checkIn: { type: new Schema({ odometer: Number, fuel: String, notes: String, photos: [String] }, { _id: false }) },
    extraCharges: { type: Number, min: 0 },
    extraChargesNote: { type: String, maxlength: 200 },
    depositRefunded: { type: Number, min: 0 },
    depositNote: { type: String, maxlength: 300 },
    depositSettledAt: { type: Date },
    amountPaid: { type: Number, min: 0 },
    paymentUpdatedAt: { type: Date },
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

// Owners' booking lists and pending counts (by rental), and renters' own bookings
BookingSchema.index({ rentalId: 1, status: 1 });
BookingSchema.index({ renterId: 1, createdAt: -1 });

export const Booking = defineModel<IBooking>("Booking", BookingSchema);
