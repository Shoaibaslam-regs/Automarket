import mongoose from "mongoose";
import { User } from "@/models/User";
import { Message } from "@/models/Message";
import { reportError } from "@/lib/errorLog";
import { privateName } from "@/lib/pusherChannels";

type SupportAdmin = { _id: mongoose.Types.ObjectId; name?: string };

/** Where support messages go when sent to the team: the shared AutoGO Support account. */
const SUPPORT_EMAIL = "support@autogo.invalid";

const g = global as unknown as { _supportAccountId?: string };

/**
 * The shared "AutoGO Support" account that users write to and that every admin answers as (Admin → Support inbox),
 * created the first time it is needed. It has no password or admin key and `authorize` refuses it, so nobody can sign
 * in as it; its email uses the reserved .invalid domain, so no mail or Google sign-in can reach it. Plan, badge and ad
 * requests, Help & support, feedback, appeals and every message the team sends to a user go through it.
 */
export async function getSupportAdmin(): Promise<SupportAdmin> {
  if (g._supportAccountId) {
    const cached = await User.findById(g._supportAccountId).select("name").lean<SupportAdmin>();
    if (cached) return cached;
  }
  const account = await User.findOneAndUpdate(
    { isSupportAccount: true },
    { $setOnInsert: { name: "AutoGO Support", email: SUPPORT_EMAIL, role: "USER", isSupportAccount: true, termsAcceptedAt: new Date(), emailVerified: new Date() } },
    { upsert: true, returnDocument: "after" }
  ).select("name").lean<SupportAdmin>();
  g._supportAccountId = String(account!._id);
  return account!;
}

export const getSupportAccount = getSupportAdmin;

/** Lets every admin's open pages (and phones) know someone wrote to AutoGO Support, for the Support inbox badge. Never throws. */
export async function notifyAdminsOfSupport(fromName?: string | null, preview?: string) {
  try {
    const admins = await User.find({ role: "ADMIN" }).select("_id").lean<Array<{ _id: mongoose.Types.ObjectId }>>();
    await Promise.all(admins.map(a => triggerPusher(`user-${a._id}`, "new-notification", { type: "support", from: fromName, preview: preview?.slice(0, 80) })));
  } catch (e) {
    reportError("Support notification failed:", e);
  }
}

/**
 * Sends a message to a user as AutoGO Support, written by `adminId` (kept on the message for the admin Support inbox
 * and Activity; users only see AutoGO Support). Used for every notice and reply from the team.
 */
export async function sendAsSupport(adminId: string | mongoose.Types.ObjectId, toUserId: string | mongoose.Types.ObjectId, content: string) {
  const support = await getSupportAdmin();
  if (String(toUserId) === String(support._id)) return;
  await sendChatMessage(String(support._id), String(toUserId), content, "AutoGO Support", String(adminId));
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
    // Callers name channels "user-…"/"chat-…"; they live as private channels, joined only through /api/pusher/auth
    await pusherServer.trigger(privateName(channel), event, data);
  } catch (e) {
    reportError("Pusher error:", e);
  }
}

/** Posts a chat message and pushes it to both sides in real time, like a message sent from the Messages page. */
export async function sendChatMessage(senderId: string, receiverId: string, content: string, fromName?: string | null, sentBy?: string) {
  const message = await Message.create({ senderId, receiverId, content, ...(sentBy ? { sentBy } : {}) });
  // Which admin wrote a support message stays inside the admin panel
  const populated = await Message.findById(message._id).select("-sentBy")
    .populate("senderId", "name image role adminAccess isSupportAccount").populate("receiverId", "name image role adminAccess isSupportAccount").lean();
  await triggerPusher(`chat-${[senderId, receiverId].sort().join("-")}`, "new-message", populated);
  const support = await getSupportAdmin();
  if (receiverId === String(support._id)) await notifyAdminsOfSupport(fromName, content);
  else await triggerPusher(`user-${receiverId}`, "new-notification", { type: "message", from: fromName, preview: content.slice(0, 50) });
}
