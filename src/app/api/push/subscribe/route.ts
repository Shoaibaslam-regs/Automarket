import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { PushSubscription } from "@/models/PushSubscription";
import { reportError } from "@/lib/errorLog";

const MAX_DEVICES = 10;

/** Saves this phone/browser for push notifications: the PushSubscription JSON from the browser. */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
    const p256dh = body.keys?.p256dh, authKey = body.keys?.auth;
    if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || typeof p256dh !== "string" || typeof authKey !== "string") {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }
    await connectDB();
    // The same phone may have been used by someone else before; it now belongs to this user
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { $set: { userId: session.user.id, keys: { p256dh, auth: authKey }, userAgent: req.headers.get("user-agent")?.slice(0, 300) } },
      { upsert: true }
    );
    // Keep only the newest devices per person
    const extra = await PushSubscription.find({ userId: session.user.id }).sort({ updatedAt: -1 }).skip(MAX_DEVICES).select("_id").lean();
    if (extra.length) await PushSubscription.deleteMany({ _id: { $in: extra.map(e => e._id) } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    reportError("Push subscribe error:", error);
    return NextResponse.json({ error: "Couldn't turn on notifications" }, { status: 500 });
  }
}

/** Stops push notifications on this device: { endpoint }. Also used when signing out. */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { endpoint } = await req.json().catch(() => ({}));
    if (typeof endpoint !== "string") return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    await connectDB();
    await PushSubscription.deleteOne({ endpoint, userId: session.user.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    reportError("Push unsubscribe error:", error);
    return NextResponse.json({ error: "Couldn't turn off notifications" }, { status: 500 });
  }
}
