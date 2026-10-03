import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name?: string;
  email: string;
  emailVerified?: Date;
  image?: string;
  password?: string;
  phone?: string;
  role: "USER" | "SELLER" | "ADMIN";
  organizationId?: mongoose.Types.ObjectId;
  organizationRole?: "OWNER" | "MANAGER" | "SALES" | "STAFF";
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true },
    emailVerified: { type: Date },
    image: { type: String },
    password: { type: String },
    phone: { type: String },
    role: { type: String, enum: ["USER", "SELLER", "ADMIN"], default: "USER" },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
    organizationRole: { type: String, enum: ["OWNER", "MANAGER", "SALES", "STAFF"] },
  },
  { timestamps: true }
);

export const User =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
