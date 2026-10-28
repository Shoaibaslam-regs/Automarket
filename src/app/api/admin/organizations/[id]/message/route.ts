import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdminApi } from "@/lib/adminAuth";
import { Organization } from "@/models/Organization";
import { sendAsSupport } from "@/lib/support";
import { logAdminAction } from "@/lib/adminLog";
import { reportError } from "@/lib/errorLog";

const MAX_TEXT = 2000;

/**
 * Admin → Businesses ⋯ "Message business": sends the business owner a chat message from AutoGO Support, written by
 * the acting admin, about anything. Body: { text }. Replies land in the shared Admin → Support inbox.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi("businesses");
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    const { text } = (await req.json().catch(() => ({}))) ?? {};
    const content = typeof text === "string" ? text.trim() : "";
    if (content.length < 2 || content.length > MAX_TEXT) return NextResponse.json({ error: `Write a message (up to ${MAX_TEXT.toLocaleString()} characters)` }, { status: 400 });
    const org = await Organization.findById(id).select("name ownerId").lean<{ _id: mongoose.Types.ObjectId; name: string; ownerId?: mongoose.Types.ObjectId }>();
    if (!org?.ownerId) return NextResponse.json({ error: "This business has no owner to message" }, { status: 404 });
    // Sent as AutoGO Support, so the whole team sees the conversation in the Support inbox
    await sendAsSupport(gate.admin._id, org.ownerId, content);
    await logAdminAction(gate.admin, "business.message", { type: "BUSINESS", id: org._id, label: org.name }, content.slice(0, 120));
    return NextResponse.json({ ok: true, ownerId: String(org.ownerId) }, { status: 201 });
  } catch (error) {
    reportError("Admin business message error:", error);
    return NextResponse.json({ error: "Couldn't send the message" }, { status: 500 });
  }
}
