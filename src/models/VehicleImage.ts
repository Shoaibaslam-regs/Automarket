import mongoose, { Schema, Document } from "mongoose";

/** An uploaded image that passed the AI vehicle check. Listings may only use URLs recorded here. */
export interface IVehicleImage extends Document {
  url: string;
  key: string;
  userId: mongoose.Types.ObjectId;
  vehicleType: string;
  createdAt: Date;
}

const VehicleImageSchema = new Schema<IVehicleImage>(
  {
    url: { type: String, required: true, unique: true },
    key: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    vehicleType: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const VehicleImage =
  mongoose.models.VehicleImage || mongoose.model<IVehicleImage>("VehicleImage", VehicleImageSchema);
