import mongoose from "mongoose";
import { User } from "@/models/User";
import { Message } from "@/models/Message";
import { reportError } from "@/lib/errorLog";

type SupportAdmin = { _id: mongoose.Types.ObjectId; name?: string };

/**
 * The admin who receives support and upgrade requests in their Messages inbox:
 * the platform owner (ADMIN_EMAIL), or else the earliest admin with full access.
 */
export async function getSupportAdmin(): Promise<SupportAdmin | null> {
  const ownerEmail = process.env.ADMIN_EMAIL?.trim();
  if (ownerEmail) {
    const owner = await User.findOne({ email: ownerEmail, role: "ADMIN" }).select("name").lean<SupportAdmin>();
    if (owner) return owner;
  }
  return User.findOne({ role: "ADMIN", adminAccess: { $ne: "READ_ONLY" } })
    .sort({ createdAt: 1 })
    .select("name")
    .lean<SupportAdmin>();
}

/** Triggers a Pusher event, doing nothing when Pusher isn't configured (same as the messages route). */
export async function triggerPusher(channel: string, event: string, data: unknown) {
  // A notification for one user also goes to the phones they turned alerts on for (works without Pusher too)
  if (event === "new-notification" && channel.startsWith("user-")) {
    const { pushForEvent } = await import("@/lib/push");
    await pushForEvent(channel.slice(5), (data ?? {}) as Parameters<typeof pushForEvent>[1]);
  }
  try {
    if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET) return;
    const { pusherServer } = await import("@/lib/pusher");
    await pusherServer.trigger(channel, event, data);
  } catch (e) {
    reportError("Pusher error:", e);
  }
}

/** Posts a chat message and pushes it to both sides in real time, like a message sent from the Messages page. */
export async function sendChatMessage(senderId: string, receiverId: string, content: string, fromName?: string | null) {
  const message = await Message.create({ senderId, receiverId, content });
  const populated = await Message.findById(message._id).populate("senderId", "name image").populate("receiverId", "name image").lean();
  await triggerPusher(`chat-${[senderId, receiverId].sort().join("-")}`, "new-message", populated);
  await triggerPusher(`user-${receiverId}`, "new-notification", { type: "message", from: fromName, preview: content.slice(0, 50) });
}
