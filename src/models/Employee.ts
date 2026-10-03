import mongoose, { Schema, Document } from "mongoose";

export interface IEmployee extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: "OWNER" | "MANAGER" | "SALES" | "STAFF";
  isActive: boolean;
  joinedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["OWNER", "MANAGER", "SALES", "STAFF"], default: "STAFF" },
    isActive: { type: Boolean, default: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Employee =
  mongoose.models.Employee ||
  mongoose.model<IEmployee>("Employee", EmployeeSchema);
