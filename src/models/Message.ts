import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  listingId?: mongoose.Types.ObjectId;
  content: string;
  read: boolean;
  /** Users who deleted this message's conversation from their inbox (per-user soft delete). */
  deletedFor: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    listingId: { type: Schema.Types.ObjectId, ref: "Listing" },
    content: { type: String, required: true },
    read: { type: Boolean, default: false },
    deletedFor: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] },
  },
  { timestamps: true }
);

MessageSchema.index({ senderId: 1, receiverId: 1 });
MessageSchema.index({ receiverId: 1, read: 1 });

export const Message =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
