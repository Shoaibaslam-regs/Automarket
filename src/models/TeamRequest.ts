import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/**
 * A plan upgrade or Verified badge request waiting for the AutoGO team (Admin → Requests). Made when a user presses
 * "Message the team" or requests the badge; closed when an admin activates the plan or approves the badge (any way:
 * the queue, Users, Plan lookup or the Businesses tab), or refuses it. The chat message is still sent, for the receipt.
 */
export interface ITeamRequest extends Document {
  kind: "PLAN" | "BADGE";
  status: "WAITING" | "DONE" | "REFUSED";
  userId: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  /** PLAN: the plan asked for; its monthly price at the time */
  plan?: string;
  price: number;
  /** The admin who took it, so two people don't handle the same request */
  takenBy?: mongoose.Types.ObjectId;
  takenAt?: Date;
  handledBy?: mongoose.Types.ObjectId;
  handledAt?: Date;
  /** What was done ("Premium until 27 Nov") or why it was refused */
  outcome?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TeamRequestSchema = new Schema<ITeamRequest>(
  {
    kind: { type: String, enum: ["PLAN", "BADGE"], required: true },
    status: { type: String, enum: ["WAITING", "DONE", "REFUSED"], default: "WAITING" },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
    plan: String,
    price: { type: Number, default: 0 },
    takenBy: { type: Schema.Types.ObjectId, ref: "User" },
    takenAt: Date,
    handledBy: { type: Schema.Types.ObjectId, ref: "User" },
    handledAt: Date,
    outcome: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

TeamRequestSchema.index({ status: 1, createdAt: -1 });
TeamRequestSchema.index({ kind: 1, status: 1, userId: 1 });
TeamRequestSchema.index({ kind: 1, status: 1, organizationId: 1 });

export const TeamRequest = defineModel<ITeamRequest>("TeamRequest", TeamRequestSchema);
