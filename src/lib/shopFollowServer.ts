// Server-only. Following shops (rules and wording in client-safe src/lib/shopFollows.ts): follow, mute, counts, the
// updates a follower sees on the Notifications page, the pushes when a shop posts, and the morning vehicles summary.
//
// Updates are worked out from the shops' own deals, announcements and vehicles each time (like every other item on
// the Notifications page), so a post doesn't write a copy for each follower; only the phone pushes fan out.
import mongoose from "mongoose";
import { ShopFollow } from "@/models/ShopFollow";
import { Organization } from "@/models/Organization";
import { Employee } from "@/models/Employee";
import { Listing } from "@/models/Listing";
import { Deal } from "@/models/Deal";
import { ShopNotice } from "@/models/ShopNotice";
import { User } from "@/models/User";
import { liveQuery } from "@/lib/publicDeals";
import { isVerified } from "@/lib/plans";
import { userChannel } from "@/lib/pusherChannels";
import { reportError } from "@/lib/errorLog";
import type { NotificationItem } from "@/lib/notifications";
import { SHOP_NOTIFY_MAX, SHOP_UPDATE_DAYS, SHOP_UPDATES_SHOWN, shopPostText, vehicleDigestText } from "@/lib/shopFollows";

type Oid = mongoose.Types.ObjectId;
const DAY = 86_400_000;

/** Followers of a shop: everyone, and those who joined since the 1st of this month (the business sees these). */
export async function followerCounts(organizationId: Oid | string): Promise<{ total: number; thisMonth: number }> {
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const [total, thisMonth] = await Promise.all([
    ShopFollow.countDocuments({ organizationId }),
    ShopFollow.countDocuments({ organizationId, createdAt: { $gte: monthStart } }),
  ]);
  return { total, thisMonth };
}

/** Members' user ids per business, for the vehicles each shop lists (inventory is its members' listings). */
async function membersByOrg(orgIds: Oid[]) {
  const rows = await Employee.find({ organizationId: { $in: orgIds } }).select("organizationId userId").lean<{ organizationId: Oid; userId: Oid }[]>();
  const orgOfSeller = new Map(rows.map(r => [String(r.userId), String(r.organizationId)]));
  return { sellerIds: rows.map(r => r.userId), orgOfSeller };
}

/**
 * New deals, announcements and vehicles from the shops this person follows and hasn't muted, since they last opened
 * Notifications (or since they followed the shop; never older than SHOP_UPDATE_DAYS), newest first. Suspended
 * shops are skipped. Each item opens the deal or the shop page.
 */
export async function shopUpdatesFor(userId: string, now = new Date()): Promise<NotificationItem[]> {
  const [user, follows] = await Promise.all([
    User.findById(userId).select("shopUpdatesSeenAt").lean<{ shopUpdatesSeenAt?: Date }>(),
    ShopFollow.find({ userId, muted: false }).select("organizationId createdAt").limit(200).lean<{ organizationId: Oid; createdAt: Date }[]>(),
  ]);
  if (!follows.length) return [];
  const floor = Math.max(user?.shopUpdatesSeenAt?.getTime() ?? 0, now.getTime() - SHOP_UPDATE_DAYS * DAY);
  const sinceOf = new Map(follows.map(f => [String(f.organizationId), new Date(Math.max(floor, f.createdAt.getTime()))]));
  const orgs = await Organization.find({ _id: { $in: follows.map(f => f.organizationId) }, isActive: { $ne: false } })
    .select("name slug").lean<{ _id: Oid; name: string; slug: string }[]>();
  if (!orgs.length) return [];
  const orgIds = orgs.map(o => o._id);
  const orgById = new Map(orgs.map(o => [String(o._id), o]));
  const minSince = new Date(Math.min(...orgIds.map(id => sinceOf.get(String(id))!.getTime())));
  const { sellerIds, orgOfSeller } = await membersByOrg(orgIds);

  const [deals, notices, listings] = await Promise.all([
    Deal.find({ organizationId: { $in: orgIds }, createdAt: { $gt: minSince }, ...liveQuery(now) }).sort({ createdAt: -1 }).limit(30)
      .select("organizationId title location endsAt createdAt").lean<{ _id: Oid; organizationId: Oid; title: string; location?: string; createdAt: Date }[]>(),
    ShopNotice.find({ organizationId: { $in: orgIds }, createdAt: { $gt: minSince }, endsAt: { $gt: now } }).sort({ createdAt: -1 }).limit(30)
      .select("organizationId title body createdAt").lean<{ _id: Oid; organizationId: Oid; title: string; body?: string; createdAt: Date }[]>(),
    Listing.find({ sellerId: { $in: sellerIds }, status: "ACTIVE", createdAt: { $gt: minSince } }).sort({ createdAt: -1 }).limit(500)
      .select("sellerId createdAt").lean<{ sellerId: Oid; createdAt: Date }[]>(),
  ]);

  const fresh = (orgId: string, at: Date) => at > (sinceOf.get(orgId) ?? now);
  const items: NotificationItem[] = [];
  for (const d of deals) {
    const org = orgById.get(String(d.organizationId));
    if (!org || !fresh(String(d.organizationId), d.createdAt)) continue;
    items.push({ kind: "shop", id: `deal-${d._id}`, title: shopPostText("deal", org.name, d.title), body: d.location ? `In ${d.location}. Tap to see the deal.` : "Tap to see the deal.", at: d.createdAt.toISOString(), href: `/deals/${d._id}` });
  }
  for (const n of notices) {
    const org = orgById.get(String(n.organizationId));
    if (!org || !fresh(String(n.organizationId), n.createdAt)) continue;
    items.push({ kind: "shop", id: `notice-${n._id}`, title: shopPostText("notice", org.name, n.title), body: n.body?.slice(0, 120) || "Tap to see it on the shop page.", at: n.createdAt.toISOString(), href: `/dealers/${org.slug}` });
  }
  // New vehicles: one line per shop
  const perShop = new Map<string, { count: number; at: Date }>();
  for (const l of listings) {
    const orgId = orgOfSeller.get(String(l.sellerId));
    if (!orgId || !fresh(orgId, l.createdAt)) continue;
    const s = perShop.get(orgId) ?? { count: 0, at: l.createdAt };
    s.count++;
    if (l.createdAt > s.at) s.at = l.createdAt;
    perShop.set(orgId, s);
  }
  for (const [orgId, s] of perShop) {
    const org = orgById.get(orgId)!;
    const text = vehicleDigestText([{ name: org.name, count: s.count }])!;
    items.push({ kind: "shop", id: `vehicles-${orgId}`, title: text.title, body: text.body, at: s.at.toISOString(), href: `/dealers/${org.slug}` });
  }
  return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, SHOP_UPDATES_SHOWN);
}

/** The Notifications page listed them: later updates are new again. */
export async function markShopUpdatesSeen(userId: string, now = new Date()) {
  await User.updateOne({ _id: userId }, { $set: { shopUpdatesSeenAt: now } });
}

/** Ids of followers to notify (unmuted), oldest followers first, at most SHOP_NOTIFY_MAX. */
async function notifyTargets(organizationId: Oid | string): Promise<Oid[]> {
  const rows = await ShopFollow.find({ organizationId, muted: false }).sort({ createdAt: 1 }).limit(SHOP_NOTIFY_MAX).select("userId").lean<{ userId: Oid }[]>();
  return rows.map(r => r.userId);
}

/** Sends one notification to many people: their phones (Web Push) and their open pages (Pusher, 100 channels a call). */
async function fanOut(userIds: Oid[], payload: { title: string; body: string; url: string; tag: string }) {
  if (!userIds.length) return;
  const { sendPush } = await import("@/lib/push");
  await sendPush(userIds, payload);
  if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET) return;
  const { pusherServer } = await import("@/lib/pusher");
  const channels = userIds.map(id => userChannel(String(id)));
  for (let i = 0; i < channels.length; i += 100) {
    await pusherServer.trigger(channels.slice(i, i + 100), "new-notification", { type: "shop", title: payload.title });
  }
}

/**
 * A shop posted a deal or an announcement: tell its followers straight away (unless they muted it). The post's own
 * team is never notified. Never throws; call it in after() so the post isn't slowed down.
 */
export async function notifyShopFollowers(organizationId: Oid | string, kind: "deal" | "notice", post: { title: string; url: string; body?: string }) {
  try {
    const org = await Organization.findById(organizationId).select("name isActive").lean<{ name: string; isActive?: boolean }>();
    if (!org || org.isActive === false) return;
    const members = new Set((await Employee.find({ organizationId }).select("userId").lean<{ userId: Oid }[]>()).map(e => String(e.userId)));
    const targets = (await notifyTargets(organizationId)).filter(id => !members.has(String(id)));
    await fanOut(targets, { title: shopPostText(kind, org.name, post.title), body: post.body ?? "Tap to see it.", url: post.url, tag: `shop-${organizationId}` });
  } catch (error) {
    reportError("Shop follower notification failed:", error);
  }
}

/**
 * The morning summary: for each follower, the shops they follow (unmuted) that listed vehicles in the last day,
 * as one push (vehicleDigestText). Returns how many people were notified. Daily job (src/lib/dailyJobs.ts).
 */
export async function sendShopVehicleDigest(now = new Date(), maxPeople = 2000): Promise<number> {
  const since = new Date(now.getTime() - DAY);
  const fresh = await Listing.find({ status: "ACTIVE", createdAt: { $gte: since } }).select("sellerId").limit(5000).lean<{ sellerId: Oid }[]>();
  if (!fresh.length) return 0;
  const sellers = [...new Set(fresh.map(l => String(l.sellerId)))];
  const employees = await Employee.find({ userId: { $in: sellers } }).select("organizationId userId").lean<{ organizationId: Oid; userId: Oid }[]>();
  const orgOfSeller = new Map(employees.map(e => [String(e.userId), String(e.organizationId)]));
  const perOrg = new Map<string, number>();
  for (const l of fresh) {
    const orgId = orgOfSeller.get(String(l.sellerId));
    if (orgId) perOrg.set(orgId, (perOrg.get(orgId) ?? 0) + 1);
  }
  if (!perOrg.size) return 0;
  const orgs = await Organization.find({ _id: { $in: [...perOrg.keys()] }, isActive: { $ne: false } }).select("name slug").lean<{ _id: Oid; name: string; slug: string }[]>();
  const follows = await ShopFollow.find({ organizationId: { $in: orgs.map(o => o._id) }, muted: false })
    .sort({ createdAt: 1 }).limit(maxPeople * 5).select("userId organizationId").lean<{ userId: Oid; organizationId: Oid }[]>();

  const byUser = new Map<string, { name: string; slug: string; count: number }[]>();
  const orgById = new Map(orgs.map(o => [String(o._id), o]));
  for (const f of follows) {
    const org = orgById.get(String(f.organizationId));
    // A team member doesn't need a summary of their own shop
    if (!org || orgOfSeller.get(String(f.userId)) === String(f.organizationId)) continue;
    const list = byUser.get(String(f.userId)) ?? [];
    list.push({ name: org.name, slug: org.slug, count: perOrg.get(String(f.organizationId)) ?? 0 });
    byUser.set(String(f.userId), list);
  }
  let sent = 0;
  for (const [userId, shops] of byUser) {
    if (sent >= maxPeople) break;
    const text = vehicleDigestText(shops);
    if (!text) continue;
    const url = shops.length === 1 ? `/dealers/${shops[0].slug}` : "/saved#shops";
    await fanOut([new mongoose.Types.ObjectId(userId)], { ...text, url, tag: "shop-vehicles" });
    sent++;
  }
  return sent;
}

/** The shops someone follows, newest follow first, with what they have live now (Saved → Shops you follow). */
export async function followedShops(userId: string, now = new Date()) {
  const follows = await ShopFollow.find({ userId }).sort({ createdAt: -1 }).limit(200).select("organizationId muted").lean<{ organizationId: Oid; muted: boolean }[]>();
  if (!follows.length) return [];
  const orgs = await Organization.find({ _id: { $in: follows.map(f => f.organizationId) }, isActive: { $ne: false } })
    .select("name slug logo type city verification.verifiedAt verification.expiresAt")
    .lean<{ _id: Oid; name: string; slug: string; logo?: string; type: string; city?: string; verification?: { verifiedAt?: Date; expiresAt?: Date } }[]>();
  const orgIds = orgs.map(o => o._id);
  const { sellerIds, orgOfSeller } = await membersByOrg(orgIds);
  const [listings, deals] = await Promise.all([
    Listing.find({ sellerId: { $in: sellerIds }, status: "ACTIVE" }).select("sellerId type").limit(5000).lean<{ sellerId: Oid; type: string }[]>(),
    Deal.find({ organizationId: { $in: orgIds }, ...liveQuery(now) }).select("organizationId").lean<{ organizationId: Oid }[]>(),
  ]);
  const tally = new Map<string, { forSale: number; forRent: number; deals: number }>();
  const t = (id: string) => { const v = tally.get(id) ?? { forSale: 0, forRent: 0, deals: 0 }; tally.set(id, v); return v; };
  for (const l of listings) {
    const orgId = orgOfSeller.get(String(l.sellerId));
    if (!orgId) continue;
    if (l.type !== "RENT") t(orgId).forSale++;
    if (l.type !== "SALE") t(orgId).forRent++;
  }
  for (const d of deals) t(String(d.organizationId)).deals++;
  const orgById = new Map(orgs.map(o => [String(o._id), o]));
  return follows.flatMap(f => {
    const o = orgById.get(String(f.organizationId));
    if (!o) return [];
    const c = tally.get(String(o._id)) ?? { forSale: 0, forRent: 0, deals: 0 };
    return [{ slug: o.slug, name: o.name, logo: o.logo ?? null, verified: isVerified(o.verification), type: o.type, city: o.city ?? null, ...c, muted: f.muted }];
  });
}
