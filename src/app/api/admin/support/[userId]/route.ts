import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdminApi } from "@/lib/adminAuth";
import { User } from "@/models/User";
import { Message } from "@/models/Message";
import { Organization } from "@/models/Organization";
import { SupportThread } from "@/models/SupportThread";
import { getSupportAccount, sendAsSupport } from "@/lib/support";
import { deleteSupportConversations, markSupportDone, supportConversations } from "@/lib/supportInbox";
import { isPlatformOwner } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/adminLog";
import { effectivePlanId } from "@/lib/plans";
import { reportError } from "@/lib/errorLog";

export const dynamic = "force-dynamic";

const MAX_TEXT = 2000;
type Oid = mongoose.Types.ObjectId;

async function load(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  return User.findById(userId).select("name email image organizationId plan planExpiresAt isSupportAccount")
    .lean<{ _id: Oid; name?: string; email: string; image?: string; organizationId?: Oid; plan?: string; planExpiresAt?: Date; isSupportAccount?: boolean }>();
}

/** One person's conversation with AutoGO Support, oldest first (the last 300), with who wrote each team reply. Marks their messages read. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  try {
    const { userId } = await params;
    const person = await load(userId);
    if (!person || person.isSupportAccount) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    const support = await getSupportAccount();
    const between = { $or: [{ senderId: support._id, receiverId: person._id }, { senderId: person._id, receiverId: support._id }], deletedFor: { $ne: support._id } };
    const messages = (await Message.find(between).sort({ createdAt: -1 }).limit(300).populate("sentBy", "name email").lean()).reverse();
    await Message.updateMany({ senderId: person._id, receiverId: support._id, read: false }, { $set: { read: true } });
    const [org, thread] = await Promise.all([
      person.organizationId ? Organization.findById(person.organizationId).select("name slug").lean<{ _id: Oid; name: string; slug: string }>() : null,
      SupportThread.findOne({ userId: person._id }).populate("takenBy", "name email").lean<{ takenBy?: { _id: Oid; name?: string; email: string } | null; doneAt?: Date }>(),
    ]);
    return NextResponse.json({
      supportId: String(support._id),
      person: { _id: String(person._id), name: person.name, email: person.email, image: person.image, plan: effectivePlanId(person.plan, person.planExpiresAt) },
      business: org ? { _id: String(org._id), name: org.name, slug: org.slug } : null,
      takenBy: thread?.takenBy ? { _id: String(thread.takenBy._id), name: thread.takenBy.name, email: thread.takenBy.email } : null,
      doneAt: thread?.doneAt ?? null,
      messages,
    });
  } catch (error) {
    reportError("Support conversation GET error:", error);
    return NextResponse.json({ error: "Failed to load the conversation" }, { status: 500 });
  }
}

/** Replies as AutoGO Support (any admin). Body: { text }. Marks the conversation done until the person writes again. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  try {
    const { userId } = await params;
    const person = await load(userId);
    if (!person || person.isSupportAccount) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    const { text } = (await req.json().catch(() => ({}))) ?? {};
    const content = typeof text === "string" ? text.trim() : "";
    if (!content || content.length > MAX_TEXT) return NextResponse.json({ error: `Write a reply (up to ${MAX_TEXT.toLocaleString()} characters)` }, { status: 400 });
    await sendAsSupport(gate.admin._id, person._id, content);
    await markSupportDone(person._id, gate.admin._id);
    await logAdminAction(gate.admin, "support.reply", { type: "USER", id: person._id, label: person.name || person.email }, content.slice(0, 120));
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    reportError("Support reply error:", error);
    return NextResponse.json({ error: "Couldn't send the reply" }, { status: 500 });
  }
}

/** Body: { action: "take" | "release" | "done" | "reopen" }: who is on it, and whether it still needs the team. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  try {
    const { userId } = await params;
    const person = await load(userId);
    if (!person || person.isSupportAccount) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    const { action } = (await req.json().catch(() => ({}))) ?? {};
    if (action === "take") await SupportThread.updateOne({ userId: person._id }, { $set: { takenBy: gate.admin._id, takenAt: new Date() } }, { upsert: true });
    else if (action === "release") await SupportThread.updateOne({ userId: person._id }, { $unset: { takenBy: "", takenAt: "" } });
    else if (action === "done") await markSupportDone(person._id, gate.admin._id);
    else if (action === "reopen") await SupportThread.updateOne({ userId: person._id }, { $unset: { doneAt: "", doneBy: "" } });
    else return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    reportError("Support conversation PATCH error:", error);
    return NextResponse.json({ error: "Failed to update the conversation" }, { status: 500 });
  }
}

/**
 * Deletes a finished conversation from the Support inbox. Only the platform owner can, and only once it's done (not
 * waiting for the team). The person keeps their copy in Messages; logged as `support.delete`.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  if (!isPlatformOwner(gate.admin.email)) return NextResponse.json({ error: "Only the platform owner can delete support conversations" }, { status: 403 });
  try {
    const { userId } = await params;
    const person = await load(userId);
    if (!person || person.isSupportAccount) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    const row = (await supportConversations()).find(c => c.userId === String(person._id));
    if (!row) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    if (row.open) return NextResponse.json({ error: "Mark it done first. They're still waiting for the team." }, { status: 409 });
    const removed = await deleteSupportConversations([person._id]);
    await logAdminAction(gate.admin, "support.delete", { type: "USER", id: person._id, label: person.name || person.email }, `${removed} messages`);
    return NextResponse.json({ ok: true, removed });
  } catch (error) {
    reportError("Support conversation DELETE error:", error);
    return NextResponse.json({ error: "Couldn't delete the conversation" }, { status: 500 });
  }
}
