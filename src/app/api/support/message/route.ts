import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Message } from "@/models/Message";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { getSupportAdmin, notifyAdminsOfSupport, triggerPusher } from "@/lib/support";
import { supportTopicLabel } from "@/lib/supportTopics";
import { hitRateLimit, isRateLimited, rateLimitResponse, waitText, clientIp } from "@/lib/rateLimit";
import { reportError } from "@/lib/errorLog";

import { turnstileRefusal, verifyTurnstile } from "@/lib/turnstile";
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

/**
 * Sends a support message to the AutoGO team's inbox, prefixed with the topic and the sender's
 * business and account ID so the admin has context. Works for suspended businesses too, so they can appeal.
 * Returns the support admin's id so the client can open the conversation.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Sign in to contact the team" }, { status: 401 });
    const limited = await rateLimitResponse("support", session.user.id, "messages to the team");
    if (limited) return limited;
    const { topic, message, cf } = await req.json().catch(() => ({}));
    if (!(await verifyTurnstile(cf, clientIp(req)))) return turnstileRefusal();
    const topicLabel = supportTopicLabel(topic);
    if (!topicLabel) return NextResponse.json({ error: "Choose a topic" }, { status: 400 });
    // Feedback is limited to two a month per account: refused early here when already used up, counted below
    const isFeedback = topic === "FEEDBACK";
    if (isFeedback) {
      const fb = await isRateLimited("feedback", session.user.id);
      if (!fb.ok) {
        return NextResponse.json(
          { error: `You've already sent 2 feedback messages this month. You can send more in ${waitText(fb.retryAfterSec)}.`, code: "RATE_LIMITED", retryAfter: fb.retryAfterSec },
          { status: 429, headers: { "Retry-After": String(fb.retryAfterSec) } }
        );
      }
    }
    const text = typeof message === "string" ? message.trim() : "";
    if (text.length < 10 || text.length > 2000) return NextResponse.json({ error: "Please write between 10 and 2000 characters" }, { status: 400 });

    await connectDB();
    const admin = await getSupportAdmin();


    const me = await User.findById(session.user.id).select("organizationId").lean<{ organizationId?: mongoose.Types.ObjectId }>();
    const org = me?.organizationId ? await Organization.findById(me.organizationId).select("name").lean<{ _id: mongoose.Types.ObjectId; name: string }>() : null;
    // Help & support topics are about a business; an account without one can only send feedback
    if (!org && !isFeedback) {
      return NextResponse.json(
        { error: "Register your business first to contact business support. You can still send feedback from the menu.", code: "NO_BUSINESS" },
        { status: 403 }
      );
    }
    const context = [org ? `Business: ${org.name} (business ID #${String(org._id).slice(-6)})` : null, `ID #${session.user.id.slice(-6)}`].filter(Boolean).join(" · ");
    const content = `[${topicLabel}] ${context}\n\n${text}`;

    const recent = await Message.exists({
      senderId: session.user.id,
      receiverId: admin._id,
      content,
      createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
    });
    // Counted atomically just before sending (so two sends at once can't both slip in), and only for new feedback
    if (isFeedback && !recent) {
      const fb = await hitRateLimit("feedback", session.user.id);
      if (!fb.ok) {
        return NextResponse.json(
          { error: `You've already sent 2 feedback messages this month. You can send more in ${waitText(fb.retryAfterSec)}.`, code: "RATE_LIMITED", retryAfter: fb.retryAfterSec },
          { status: 429, headers: { "Retry-After": String(fb.retryAfterSec) } }
        );
      }
    }
    if (!recent) {
      const created = await Message.create({ senderId: session.user.id, receiverId: admin._id, content });
      const populated = await Message.findById(created._id).populate("senderId", "name image").populate("receiverId", "name image").lean();
      const adminId = admin._id.toString();
      await triggerPusher(`chat-${[session.user.id, adminId].sort().join("-")}`, "new-message", populated);
      await notifyAdminsOfSupport(session.user.name, content);
    }
    return NextResponse.json({ supportUserId: admin._id.toString() }, { status: recent ? 200 : 201 });
  } catch (error) {
    reportError("Support message error:", error);
    return NextResponse.json({ error: "Failed to send your message" }, { status: 500 });
  }
}
