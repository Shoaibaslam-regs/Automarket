import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Ad } from "@/models/Ad";
import { clientIp, hitRateLimit } from "@/lib/rateLimit";
import { reportError } from "@/lib/errorLog";

/**
 * Counts sponsored ad views and taps: { ids, event: "view" | "tap" } (sent with sendBeacon by the cards, at most once
 * per ad per browser session). Open to everyone, so it is limited per IP, only counts ads that are running, and always
 * answers 204.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const event = body?.event === "tap" ? "tap" : body?.event === "view" ? "view" : null;
    const ids = Array.isArray(body?.ids)
      ? [...new Set(body.ids.filter((id: unknown) => typeof id === "string" && mongoose.Types.ObjectId.isValid(id)))].slice(0, 24) as string[]
      : [];
    if (!event || !ids.length) return new NextResponse(null, { status: 204 });
    const limit = await hitRateLimit("adTrack", clientIp(req), ids.length);
    if (!limit.ok) return new NextResponse(null, { status: 204 });

    await connectDB();
    const now = new Date();
    await Ad.updateMany(
      { _id: { $in: ids }, status: "APPROVED", startsAt: { $lte: now }, endsAt: { $gt: now } },
      { $inc: event === "tap" ? { taps: 1 } : { views: 1 } }
    );
  } catch (error) {
    reportError("Sponsored track error:", error);
  }
  return new NextResponse(null, { status: 204 });
}
