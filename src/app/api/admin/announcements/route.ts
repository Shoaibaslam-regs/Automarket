import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireAdminApi } from "@/lib/adminAuth";
import { Announcement } from "@/models/Announcement";
import { Organization } from "@/models/Organization";
import { logAdminAction } from "@/lib/adminLog";
import { notifyFollowers, parseAnnouncement } from "@/lib/official";
import { reportError } from "@/lib/errorLog";

/** Every official post, newest first (pinned on top), with the number of following businesses. */
export async function GET() {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  try {
    await connectDB();
    const [announcements, followers, businesses] = await Promise.all([
      Announcement.find().sort({ pinned: -1, createdAt: -1 }).limit(200).populate("createdBy", "name email").lean(),
      Organization.countDocuments({ followsOfficial: true }),
      Organization.countDocuments({}),
    ]);
    return NextResponse.json({ announcements, followers, businesses });
  } catch (error) {
    reportError("Admin announcements GET error:", error);
    return NextResponse.json({ error: "Failed to load announcements" }, { status: 500 });
  }
}

/**
 * Posts to the channel and notifies following businesses. With `draft: true` it's saved for the admins only
 * (status DRAFT, nobody notified) and published later with PATCH `{ publish: true }`.
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdminApi("announcements");
  if (!gate.ok) return gate.response;
  try {
    await connectDB();
    const body = (await req.json().catch(() => ({}))) ?? {};
    const draft = body.draft === true;
    const parsed = parseAnnouncement(body);
    if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const announcement = await Announcement.create({ ...parsed.data, status: draft ? "DRAFT" : "PUBLISHED", createdBy: gate.admin._id });
    await logAdminAction(gate.admin, draft ? "announcement.draft" : "announcement.create", { type: "ANNOUNCEMENT", id: announcement._id, label: announcement.title }, announcement.kind);
    if (!draft) await notifyFollowers({ title: announcement.title, kind: announcement.kind });
    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    reportError("Admin announcements POST error:", error);
    return NextResponse.json({ error: "Failed to post the announcement" }, { status: 500 });
  }
}
