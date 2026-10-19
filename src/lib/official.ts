import mongoose from "mongoose";
import { Organization } from "@/models/Organization";
import { Employee } from "@/models/Employee";
import { Announcement } from "@/models/Announcement";
import { ANNOUNCEMENT_KINDS, MAX_BODY, MAX_TITLE, type AnnouncementKind } from "@/lib/announcements";

type Oid = mongoose.Types.ObjectId;

/** Validates an announcement from an admin's request body (all fields for a new post, or only the ones sent when editing). */
export function parseAnnouncement(body: Record<string, unknown>, partial = false):
  { data: Partial<{ kind: AnnouncementKind; title: string; body: string; link: string | undefined; linkLabel: string | undefined; pinned: boolean; endsAt: Date | undefined }>; error?: undefined } | { error: string; data?: undefined } {
  const data: Record<string, unknown> = {};
  const has = (k: string) => body[k] !== undefined;
  if (!partial || has("kind")) {
    const kind = String(body.kind ?? "ANNOUNCEMENT");
    if (!(ANNOUNCEMENT_KINDS as readonly string[]).includes(kind)) return { error: "Choose announcement, update or offer" };
    data.kind = kind;
  }
  if (!partial || has("title")) {
    const title = String(body.title ?? "").replace(/\s+/g, " ").trim();
    if (title.length < 3) return { error: "Write a title" };
    data.title = title.slice(0, MAX_TITLE);
  }
  if (!partial || has("body")) {
    const text = String(body.body ?? "").trim();
    if (text.length < 3) return { error: "Write the message" };
    data.body = text.slice(0, MAX_BODY);
  }
  if (!partial || has("link")) {
    const link = String(body.link ?? "").trim();
    // Only AutoMarket paths or https links, so a post can't carry javascript: or other schemes
    if (link && !/^\/[^/]/.test(link) && !/^https:\/\/[^\s]+$/i.test(link)) return { error: "The link must start with / (an AutoMarket page) or https://" };
    data.link = link || undefined;
    data.linkLabel = link ? String(body.linkLabel ?? "").trim().slice(0, 40) || "Open" : undefined;
  }
  if (!partial || has("pinned")) data.pinned = body.pinned === true;
  if (!partial || has("endsAt")) {
    if (body.endsAt) {
      const d = new Date(String(body.endsAt));
      if (isNaN(d.getTime())) return { error: "Choose when the offer ends" };
      data.endsAt = d;
    } else data.endsAt = undefined;
  }
  return { data };
}

/** User ids of every member of the businesses that follow the channel (active businesses only). */
export async function followerUserIds(): Promise<Oid[]> {
  const orgs = await Organization.find({ followsOfficial: true, isActive: true }).select("_id").lean<Array<{ _id: Oid }>>();
  if (!orgs.length) return [];
  const members = await Employee.find({ organizationId: { $in: orgs.map(o => o._id) } }).select("userId").lean<Array<{ userId: Oid }>>();
  return members.map(m => m.userId);
}

/** Tells followers' open pages about a new post so their Updates badge appears straight away. Never throws. */
export async function notifyFollowers(payload: { title: string; kind: string }) {
  try {
    const ids = await followerUserIds();
    if (!ids.length) return;
    // Phones of followers who turned alerts on
    const { sendPush } = await import("@/lib/push");
    await sendPush(ids, { title: "AutoMarket Official", body: payload.title, url: "/business/updates", tag: "official" });
    if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET) return;
    const { pusherServer } = await import("@/lib/pusher");
    const channels = ids.map(id => `user-${id}`);
    // Pusher accepts up to 100 channels per trigger
    for (let i = 0; i < channels.length; i += 100) {
      await pusherServer.trigger(channels.slice(i, i + 100), "new-notification", { type: "official", ...payload });
    }
  } catch (e) {
    console.error("Official notification failed:", e);
  }
}

/** Posts this user hasn't seen: newer than both their last visit to Updates and the moment their business followed. */
export async function unreadOfficialCount(user: { officialSeenAt?: Date | null }, org: { followsOfficial?: boolean; followedOfficialAt?: Date | null }) {
  if (!org.followsOfficial) return 0;
  const since = new Date(Math.max(user.officialSeenAt?.getTime() ?? 0, org.followedOfficialAt?.getTime() ?? 0));
  return Announcement.countDocuments({ createdAt: { $gt: since } });
}
