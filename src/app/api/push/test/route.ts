import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { PushSubscription } from "@/models/PushSubscription";
import { sendPush } from "@/lib/push";
import { rateLimitResponse } from "@/lib/rateLimit";

/**
 * Sends a test notification to the signed-in user's own phones, so they can check alerts arrive with the
 * screen off. Says how many devices are set up, or why nothing could be sent.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await rateLimitResponse("pushTest", session.user.id, "test notifications");
  if (limited) return limited;
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "Phone notifications aren't set up on the server yet (missing VAPID keys)." }, { status: 503 });
  }
  await connectDB();
  const devices = await PushSubscription.countDocuments({ userId: session.user.id });
  if (!devices) return NextResponse.json({ error: "This account has no phone with notifications turned on." }, { status: 400 });
  await sendPush([session.user.id], { title: "AutoMarket test ✓", body: "Notifications work on this phone. You'll get booking, sale and message alerts like this.", url: "/notifications", tag: "test" });
  return NextResponse.json({ ok: true, devices });
}
