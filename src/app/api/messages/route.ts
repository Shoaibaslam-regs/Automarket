import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Message } from "@/models/Message";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";
import { getSupportAdmin, notifyAdminsOfSupport, triggerPusher } from "@/lib/support";
import { rateLimitResponse } from "@/lib/rateLimit";
import { reportError } from "@/lib/errorLog";

import { Block } from "@/models/Block";
const MAX_MESSAGE_LENGTH = 2000;

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const withUserId = searchParams.get("with");

    if (withUserId) {
      const messages = await Message.find({
        $or: [
          { senderId: session.user.id, receiverId: withUserId },
          { senderId: withUserId, receiverId: session.user.id },
        ],
        deletedFor: { $ne: session.user.id },
      })
        .select("-sentBy")
        .populate("senderId", "name image role adminAccess isSupportAccount")
        .populate("receiverId", "name image role adminAccess isSupportAccount")
        .sort({ createdAt: 1 })
        .lean();

      await Message.updateMany(
        { senderId: withUserId, receiverId: session.user.id, read: false },
        { read: true }
      );

      return NextResponse.json({ messages });
    }

    const messages = await Message.find({
      $or: [
        { senderId: session.user.id },
        { receiverId: session.user.id },
      ],
      deletedFor: { $ne: session.user.id },
    })
      .select("-sentBy")
        .populate("senderId", "name image role adminAccess isSupportAccount")
      .populate("receiverId", "name image role adminAccess isSupportAccount")
      .sort({ createdAt: -1 })
      .lean();

    const conversationMap = new Map();
    for (const msg of messages as Array<Record<string, unknown>>) {
      const sender = msg.senderId as { _id: { toString: () => string } };
      const receiver = msg.receiverId as { _id: { toString: () => string } };
      const partnerId = sender._id.toString() === session.user.id
        ? receiver._id.toString()
        : sender._id.toString();
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, msg);
      }
    }

    return NextResponse.json({ conversations: Array.from(conversationMap.values()) });
  } catch (error) {
    reportError("Messages GET error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = await rateLimitResponse("messages", session.user.id, "messages sent");
    if (limited) return limited;

    await connectDB();

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { receiverId, content, listingId } = body;

    if (typeof receiverId !== "string" || !/^[0-9a-f]{24}$/i.test(receiverId) || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Receiver and content required" }, { status: 400 });
    }
    // Messages are kept to chat size, so a few huge ones can't fill the database
    if (content.trim().length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `A message can be at most ${MAX_MESSAGE_LENGTH.toLocaleString("en-PK")} characters` }, { status: 400 });
    }

    if (receiverId === session.user.id) {
      return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
    }
    // A block either way stops the chat (AutoGO Support can't be blocked)
    const [iBlocked, theyBlocked] = await Promise.all([
      Block.exists({ blockerId: session.user.id, blockedId: receiverId }),
      Block.exists({ blockerId: receiverId, blockedId: session.user.id }),
    ]);
    if (iBlocked) return NextResponse.json({ error: "You blocked this person. Unblock them to send a message.", code: "BLOCKED" }, { status: 403 });
    if (theyBlocked) return NextResponse.json({ error: "You can't send messages to this person.", code: "BLOCKED" }, { status: 403 });

    const messageData: {
      senderId: string;
      receiverId: string;
      content: string;
      listingId?: string;
    } = {
      senderId: session.user.id,
      receiverId,
      content: content.trim(),
    };

    if (listingId && listingId !== "undefined" && listingId !== "null") {
      messageData.listingId = listingId;
    }

    const message = await Message.create(messageData);

    const populated = await Message.findById(message._id)
      .select("-sentBy")
        .populate("senderId", "name image role adminAccess isSupportAccount")
      .populate("receiverId", "name image role adminAccess isSupportAccount")
      .lean();

    const channelId = [session.user.id, receiverId].sort().join("-");
    await triggerPusher(`chat-${channelId}`, "new-message", populated);
    // A reply to AutoGO Support goes to every admin's Support inbox, not to the (unattended) account itself
    const support = await getSupportAdmin();
    if (receiverId === String(support._id)) {
      await notifyAdminsOfSupport(session.user.name, content);
    } else {
      await triggerPusher(`user-${receiverId}`, "new-notification", {
        type: "message",
        from: session.user.name,
        preview: content.slice(0, 50),
      });
    }

    return NextResponse.json({ message: populated }, { status: 201 });
  } catch (error) {
    reportError("Messages POST error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

// Deletes a conversation for the current user only; the other participant keeps their copy.
// Messages are removed from the database once both participants have deleted them.
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const withUserId = new URL(req.url).searchParams.get("with");
    if (!withUserId || !mongoose.Types.ObjectId.isValid(withUserId)) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 400 });
    }

    await connectDB();

    const me = new mongoose.Types.ObjectId(session.user.id);
    const partner = new mongoose.Types.ObjectId(withUserId);
    // Scoped to messages the current user sent or received, so nobody else's chats can be touched
    const conversation = {
      $or: [
        { senderId: me, receiverId: partner },
        { senderId: partner, receiverId: me },
      ],
    };

    // Read receipts are left untouched: the unread count already ignores messages in deletedFor,
    // and marking them read would falsely show the sender "seen".
    const result = await Message.updateMany(conversation, { $addToSet: { deletedFor: me } });
    await Message.deleteMany({ ...conversation, deletedFor: { $all: [me, partner] } });

    return NextResponse.json({ ok: true, deleted: result.modifiedCount });
  } catch (error) {
    reportError("Messages DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
  }
}
