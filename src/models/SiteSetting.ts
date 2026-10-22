import { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/** Site-wide settings that admins change from the admin panel, one document per key (e.g. "payment"). */
export interface ISiteSetting extends Document {
  key: string;
  value: unknown;
  updatedBy?: Schema.Types.ObjectId;
}

const SiteSettingSchema = new Schema<ISiteSetting>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const SiteSetting = defineModel<ISiteSetting>("SiteSetting", SiteSettingSchema);
