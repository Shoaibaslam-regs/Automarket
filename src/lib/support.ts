import mongoose from "mongoose";
import { User } from "@/models/User";

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
  try {
    if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET) return;
    const { pusherServer } = await import("@/lib/pusher");
    await pusherServer.trigger(channel, event, data);
  } catch (e) {
    console.error("Pusher error:", e);
  }
}
