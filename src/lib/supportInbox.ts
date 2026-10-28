// Server-only. The shared Admin → Support inbox: every conversation with the AutoGO Support account, built from the
// messages themselves, with the team's state from SupportThread.
import mongoose from "mongoose";
import { Message } from "@/models/Message";
import { SupportThread } from "@/models/SupportThread";
import { getSupportAccount } from "@/lib/support";

type Oid = mongoose.Types.ObjectId;

export type InboxRow = {
  userId: string;
  lastAt: Date;
  lastText: string;
  lastFromUser: boolean;
  lastUserAt: Date | null;
  unread: number;
  open: boolean;
  takenBy: string | null;
  doneAt: Date | null;
};

/** Every conversation with AutoGO Support, newest first (at most `limit`). */
export async function supportConversations(limit = 300): Promise<InboxRow[]> {
  const support = await getSupportAccount();
  const sid = support._id as Oid;
  const rows = await Message.aggregate<{ _id: Oid; lastAt: Date; lastText: string; lastSender: Oid; lastUserAt: Date | null; unread: number }>([
    // Conversations the owner deleted from the inbox are skipped (the person keeps their copy)
    { $match: { $or: [{ senderId: sid }, { receiverId: sid }], deletedFor: { $ne: sid } } },
    { $sort: { createdAt: -1 } },
    { $addFields: { partner: { $cond: [{ $eq: ["$senderId", sid] }, "$receiverId", "$senderId"] } } },
    {
      $group: {
        _id: "$partner",
        lastAt: { $first: "$createdAt" },
        lastText: { $first: "$content" },
        lastSender: { $first: "$senderId" },
        lastUserAt: { $max: { $cond: [{ $eq: ["$receiverId", sid] }, "$createdAt", null] } },
        unread: { $sum: { $cond: [{ $and: [{ $eq: ["$receiverId", sid] }, { $eq: ["$read", false] }] }, 1, 0] } },
      },
    },
    { $sort: { lastAt: -1 } },
    { $limit: limit },
  ]);
  const threads = await SupportThread.find({ userId: { $in: rows.map(r => r._id) } }).lean<Array<{ userId: Oid; takenBy?: Oid; doneAt?: Date }>>();
  const byUser = new Map(threads.map(t => [String(t.userId), t]));
  return rows.map(r => {
    const t = byUser.get(String(r._id));
    const doneAt = t?.doneAt ?? null;
    // Waiting for the team: they wrote and nobody has dealt with it since
    const open = !!r.lastUserAt && (!doneAt || r.lastUserAt > doneAt);
    return {
      userId: String(r._id),
      lastAt: r.lastAt,
      lastText: r.lastText,
      lastFromUser: !(r.lastSender as Oid).equals(sid),
      lastUserAt: r.lastUserAt,
      unread: r.unread,
      open,
      takenBy: t?.takenBy ? String(t.takenBy) : null,
      doneAt,
    };
  });
}

/** Marks the person's conversation as dealt with by this admin (replying does it too). */
export async function markSupportDone(userId: string | Oid, adminId: string | Oid) {
  await SupportThread.updateOne({ userId }, { $set: { doneAt: new Date(), doneBy: adminId } }, { upsert: true });
}

/**
 * Removes finished conversations from the Support inbox (the platform owner only, through the API). Like "Delete
 * chat" in Messages: the support side is marked deleted, the person keeps their copy, and messages neither side keeps
 * any more are deleted for good. If the person writes again, a new conversation starts. Returns the messages removed
 * from the inbox.
 */
export async function deleteSupportConversations(userIds: Array<string | Oid>): Promise<number> {
  if (!userIds.length) return 0;
  const support = await getSupportAccount();
  const sid = support._id as Oid;
  const ids = userIds.map(id => new mongoose.Types.ObjectId(String(id)));
  const between = { $or: [{ senderId: sid, receiverId: { $in: ids } }, { senderId: { $in: ids }, receiverId: sid }] };
  const marked = await Message.updateMany({ ...between, deletedFor: { $ne: sid } }, { $addToSet: { deletedFor: sid } });
  // Gone from both sides: nobody can see these any more
  await Message.deleteMany({
    $or: ids.map(id => ({ $or: [{ senderId: sid, receiverId: id }, { senderId: id, receiverId: sid }], deletedFor: { $all: [sid, id] } })),
  });
  await SupportThread.deleteMany({ userId: { $in: ids } });
  return marked.modifiedCount;
}
