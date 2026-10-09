import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Message } from "@/models/Message";
import { User } from "@/models/User";
import { getSupportAdmin, triggerPusher } from "@/lib/support";
import { isPlanId, PLANS } from "@/lib/plans";
import { upgradeRequestText } from "@/lib/supportContact";

/** Don't post the same request twice if the user clicks again within this window. */
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

/**
 * Sends a plan upgrade request to the AutoMarket team as a chat message,
 * so it lands in the support admin's Messages inbox and they can reply there.
 * Returns the admin's id so the client can open that conversation.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { plan } = await req.json().catch(() => ({}));
    if (!isPlanId(plan) || plan === "FREE") return NextResponse.json({ error: "Choose a paid plan" }, { status: 400 });

    await connectDB();
    const admin = await getSupportAdmin();
    if (!admin) return NextResponse.json({ error: "The support team isn't available right now. Please try again later." }, { status: 503 });
    if (admin._id.equals(session.user.id)) {
      return NextResponse.json({ error: "You're the support admin; use the admin panel to change plans." }, { status: 400 });
    }

    const me = await User.findById(session.user.id).select("email").lean<{ email: string }>();
    const content = upgradeRequestText(PLANS[plan].name, PLANS[plan].price, { id: session.user.id, email: me?.email });

    const recent = await Message.exists({
      senderId: session.user.id,
      receiverId: admin._id,
      content,
      createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
    });
    if (!recent) {
      const message = await Message.create({ senderId: session.user.id, receiverId: admin._id, content });
      const populated = await Message.findById(message._id).populate("senderId", "name image").populate("receiverId", "name image").lean();
      const adminId = admin._id.toString();
      await triggerPusher(`chat-${[session.user.id, adminId].sort().join("-")}`, "new-message", populated);
      await triggerPusher(`user-${adminId}`, "new-notification", { type: "message", from: session.user.name, preview: content.slice(0, 50) });
    }

    return NextResponse.json({ supportUserId: admin._id.toString() }, { status: recent ? 200 : 201 });
  } catch (error) {
    console.error("Upgrade request error:", error);
    return NextResponse.json({ error: "Failed to send your request" }, { status: 500 });
  }
}
