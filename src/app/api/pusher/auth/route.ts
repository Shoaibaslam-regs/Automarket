import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canJoinChannel } from "@/lib/pusherChannels";
import { reportError } from "@/lib/errorLog";

/**
 * Pusher's channel authorization for private channels (src/lib/pusherChannels.ts). The browser posts the socket
 * and channel it wants to join; only the signed-in user's own channel and chats they are part of are signed.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const form = new URLSearchParams(await req.text());
    const socketId = form.get("socket_id") ?? "";
    const channel = form.get("channel_name") ?? "";
    if (!/^\d+\.\d+$/.test(socketId) || !canJoinChannel(channel, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET) {
      return NextResponse.json({ error: "Live updates aren't set up" }, { status: 503 });
    }
    const { pusherServer } = await import("@/lib/pusher");
    return NextResponse.json(pusherServer.authorizeChannel(socketId, channel));
  } catch (error) {
    reportError("Pusher auth error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
