import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { ShopFollow } from "@/models/ShopFollow";
import { getOrgUserIds } from "@/lib/business";
import { rateLimitResponse } from "@/lib/rateLimit";
import { reportError } from "@/lib/errorLog";
import { MAX_FOLLOWED_SHOPS } from "@/lib/shopFollows";

const PRIVATE = { "Cache-Control": "private, no-store" };
type Oid = mongoose.Types.ObjectId;

async function shopAndRole(slug: string, userId: string) {
  const org = await Organization.findOne({ slug }).select("_id isActive").lean<{ _id: Oid; isActive?: boolean }>();
  if (!org) return null;
  const member = (await getOrgUserIds(org._id)).some(id => String(id) === userId);
  return { org, member };
}

/** The visitor's follow of this shop (the shop page is cached for everyone, so this part is asked for separately). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ viewer: "anon", following: false, muted: false }, { headers: PRIVATE });
    const { slug } = await params;
    await connectDB();
    const found = await shopAndRole(slug, session.user.id);
    if (!found) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    const follow = await ShopFollow.findOne({ userId: session.user.id, organizationId: found.org._id }).select("muted").lean<{ muted: boolean }>();
    return NextResponse.json({ viewer: found.member ? "member" : "user", following: !!follow, muted: !!follow?.muted }, { headers: PRIVATE });
  } catch (error) {
    reportError("Shop follow GET error:", error);
    return NextResponse.json({ error: "Couldn't load" }, { status: 500 });
  }
}

/** `{ action: "follow" | "unfollow" | "mute" | "unmute" }`. A team can't follow its own shop; suspended shops can only be unfollowed. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to follow shops" }, { status: 401 });
  const limited = await rateLimitResponse("follows", session.user.id, "changes");
  if (limited) return limited;
  try {
    const { action } = (await req.json().catch(() => ({}))) ?? {};
    if (!["follow", "unfollow", "mute", "unmute"].includes(action)) return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    const { slug } = await params;
    await connectDB();
    const found = await shopAndRole(slug, session.user.id);
    if (!found) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    const key = { userId: session.user.id, organizationId: found.org._id };

    if (action === "unfollow") {
      await ShopFollow.deleteOne(key);
      return NextResponse.json({ following: false, muted: false });
    }
    if (action === "follow") {
      if (found.member) return NextResponse.json({ error: "This is your own shop" }, { status: 400 });
      if (found.org.isActive === false) return NextResponse.json({ error: "This shop isn't available right now" }, { status: 400 });
      if ((await ShopFollow.countDocuments({ userId: session.user.id })) >= MAX_FOLLOWED_SHOPS) {
        return NextResponse.json({ error: `You can follow up to ${MAX_FOLLOWED_SHOPS} shops. Unfollow one first.` }, { status: 400 });
      }
      await ShopFollow.updateOne(key, { $setOnInsert: { muted: false } }, { upsert: true }).catch((e: { code?: number }) => { if (e.code !== 11000) throw e; });
      return NextResponse.json({ following: true, muted: false }, { status: 201 });
    }
    const updated = await ShopFollow.findOneAndUpdate(key, { $set: { muted: action === "mute" } }, { returnDocument: "after" }).select("muted").lean<{ muted: boolean }>();
    if (!updated) return NextResponse.json({ error: "Follow the shop first" }, { status: 400 });
    return NextResponse.json({ following: true, muted: updated.muted });
  } catch (error) {
    reportError("Shop follow POST error:", error);
    return NextResponse.json({ error: "Couldn't change it right now" }, { status: 500 });
  }
}
