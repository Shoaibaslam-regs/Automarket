import webpush from "web-push";
import { connectDB } from "@/lib/mongodb";
import { PushSubscription } from "@/models/PushSubscription";
import { reportError } from "@/lib/errorLog";

/** What a phone notification shows; `url` opens when it's tapped, `tag` replaces an older one with the same tag. */
export type PushPayload = { title: string; body: string; url: string; tag?: string };

let configured: boolean | null = null;
function ready(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (configured = false);
  const subject = process.env.VAPID_SUBJECT || `mailto:${process.env.ADMIN_EMAIL || "support@automarket.pk"}`;
  webpush.setVapidDetails(subject, pub, priv);
  return (configured = true);
}

/**
 * Sends a phone notification to every device the users turned alerts on for. Never throws, and does nothing
 * when the VAPID keys aren't set. Devices that unsubscribed or were reset (404/410) are removed.
 */
export async function sendPush(userIds: unknown[], payload: PushPayload) {
  try {
    if (!ready() || !userIds.length) return;
    await connectDB();
    const subs = await PushSubscription.find({ userId: { $in: userIds } }).select("endpoint keys").lean<Array<{ _id: unknown; endpoint: string; keys: { p256dh: string; auth: string } }>>();
    if (!subs.length) return;
    const body = JSON.stringify({ ...payload, body: payload.body.slice(0, 180) });
    const gone: unknown[] = [];
    await Promise.all(subs.map(s =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, body, { TTL: 60 * 60 * 24, urgency: "high" })
        .catch((err: { statusCode?: number }) => { if (err.statusCode === 404 || err.statusCode === 410) gone.push(s._id); })
    ));
    if (gone.length) await PushSubscription.deleteMany({ _id: { $in: gone } });
    await PushSubscription.updateMany({ _id: { $in: subs.map(s => s._id).filter(id => !gone.includes(id)) } }, { $set: { lastSentAt: new Date() } });
  } catch (e) {
    reportError("Push failed:", e);
  }
}

type EventData = { type?: string; from?: string | null; preview?: string; status?: string; rating?: number; note?: string };

/**
 * Turns a `new-notification` event (the same one that updates the in-app badges) into a phone notification,
 * so every place that notifies a user also reaches their phone. Called by triggerPusher.
 */
export function pushForEvent(userId: string, data: EventData) {
  const p = ((): PushPayload | null => {
    switch (data.type) {
      case "message":
        return { title: data.from ? `New message from ${data.from}` : "New message", body: data.preview || "Open AutoGO to read it.", url: "/messages", tag: "message" };
      case "booking":
        if (data.status === "PENDING") return { title: "New booking request", body: "Someone wants to book your vehicle. Confirm or decline it.", url: "/notifications", tag: "booking-request" };
        if (data.status === "CONFIRMED") return { title: "Booking confirmed ✓", body: "Your booking was confirmed by the owner.", url: "/bookings", tag: "booking" };
        if (data.status === "CANCELLED") return { title: "Booking cancelled", body: "One of your bookings was cancelled.", url: "/bookings", tag: "booking" };
        return null;
      case "purchase": {
        const what = data.status === "ACCEPTED" ? "was accepted" : data.status === "COMPLETED" ? "is complete. Congratulations!" : data.status === "DECLINED" ? "was declined" : "was updated";
        return { title: "Purchase update", body: `Your purchase request ${what}`, url: "/purchases", tag: "purchase" };
      }
      case "sale":
        return { title: data.note ? "Purchase request cancelled" : "New purchase request", body: data.note || "A buyer wants to buy one of your vehicles.", url: "/business/sales", tag: "sale" };
      case "review":
        return { title: "New review", body: data.rating ? `Someone gave your business ${data.rating}★` : "Your business got a new review.", url: "/business/reviews", tag: "review" };
      case "report":
        return { title: "New report", body: "A listing, deal or business was reported.", url: "/admin/reports", tag: "report" };
      case "support":
        return { title: data.from ? `Support: ${data.from}` : "New support message", body: data.preview || "Someone wrote to AutoGO Support.", url: "/admin/support", tag: "support" };
      default:
        return null;
    }
  })();
  return p ? sendPush([userId], p) : Promise.resolve();
}
