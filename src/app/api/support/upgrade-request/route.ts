import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Message } from "@/models/Message";
import { User } from "@/models/User";
import { getSupportAdmin, notifyAdminsOfSupport, triggerPusher } from "@/lib/support";
import { isPlanId, PLANS } from "@/lib/plans";
import { upgradeRequestText } from "@/lib/supportContact";
import { rateLimitResponse } from "@/lib/rateLimit";
import { reportError } from "@/lib/errorLog";
import { getMembership } from "@/lib/business";
import { Organization } from "@/models/Organization";
import { openTeamRequest } from "@/lib/teamRequests";

/** Don't post the same request twice if the user clicks again within this window. */
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

/**
 * Sends a plan upgrade request to the AutoGO team as a chat message,
 * so it lands in the support admin's Messages inbox and they can reply there.
 * Returns the admin's id so the client can open that conversation.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const limited = await rateLimitResponse("support", session.user.id, "requests");
    if (limited) return limited;
    const { plan } = await req.json().catch(() => ({}));
    if (!isPlanId(plan) || plan === "FREE") return NextResponse.json({ error: "Choose a paid plan" }, { status: 400 });

    await connectDB();
    const admin = await getSupportAdmin();


    const me = await User.findById(session.user.id).select("email").lean<{ email: string }>();
    // A business runs on its owner's plan, so the request names the business too
    const member = await getMembership(session.user.id);
    const org = member ? await Organization.findById(member.organizationId).select("name").lean<{ _id: unknown; name: string }>() : null;
    const content = upgradeRequestText(PLANS[plan].name, PLANS[plan].price, {
      id: session.user.id, email: me?.email, business: org ? { id: String(org._id), name: org.name } : null,
    });

    // The team's to-do list (Admin → Requests); the chat message below is for the receipt and questions
    await openTeamRequest({ kind: "PLAN", userId: session.user.id, organizationId: org ? String(org._id) : null, plan, price: PLANS[plan].price });

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
      await notifyAdminsOfSupport(session.user.name, content);
    }

    return NextResponse.json({ supportUserId: admin._id.toString() }, { status: recent ? 200 : 201 });
  } catch (error) {
    reportError("Upgrade request error:", error);
    return NextResponse.json({ error: "Failed to send your request" }, { status: 500 });
  }
}
