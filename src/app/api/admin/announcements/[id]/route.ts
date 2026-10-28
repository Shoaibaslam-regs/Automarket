import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireAdminApi } from "@/lib/adminAuth";
import { Announcement } from "@/models/Announcement";
import { logAdminAction } from "@/lib/adminLog";
import { notifyFollowers, parseAnnouncement } from "@/lib/official";
import { reportError } from "@/lib/errorLog";

/**
 * Edits a post (only the fields sent), e.g. { pinned: true }. Followers aren't notified again.
 * `publish: true` on a draft publishes it: its date becomes now, so feeds and unread counts treat it as new, and
 * followers are notified.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi("announcements");
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await connectDB();
    const body = (await req.json().catch(() => ({}))) ?? {};
    const parsed = parseAnnouncement(body, true);
    if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const set: Record<string, unknown> = {}, unset: Record<string, 1> = {};
    for (const [k, v] of Object.entries(parsed.data)) if (v === undefined) unset[k] = 1; else set[k] = v;
    const announcement = await Announcement.findByIdAndUpdate(id, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { new: true });
    if (!announcement) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (body.publish === true) {
      // Only one request publishes it. createdAt is immutable in Mongoose, so it's set on the collection directly.
      const done = await Announcement.collection.updateOne(
        { _id: announcement._id, status: "DRAFT" },
        { $set: { status: "PUBLISHED", createdAt: new Date(), updatedAt: new Date() } }
      );
      if (!done.modifiedCount) return NextResponse.json({ error: "This post is already published" }, { status: 409 });
      await logAdminAction(gate.admin, "announcement.publish", { type: "ANNOUNCEMENT", id: announcement._id, label: announcement.title }, announcement.kind);
      await notifyFollowers({ title: announcement.title, kind: announcement.kind });
      return NextResponse.json({ announcement: await Announcement.findById(id) });
    }
    await logAdminAction(gate.admin, "announcement.update", { type: "ANNOUNCEMENT", id: announcement._id, label: announcement.title }, Object.keys(parsed.data).join(", "));
    return NextResponse.json({ announcement });
  } catch (error) {
    reportError("Admin announcement PATCH error:", error);
    return NextResponse.json({ error: "Failed to update the announcement" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi("announcements");
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await connectDB();
    const announcement = await Announcement.findByIdAndDelete(id);
    if (!announcement) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await logAdminAction(gate.admin, "announcement.delete", { type: "ANNOUNCEMENT", id: announcement._id, label: announcement.title });
    return NextResponse.json({ ok: true });
  } catch (error) {
    reportError("Admin announcement DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete the announcement" }, { status: 500 });
  }
}
