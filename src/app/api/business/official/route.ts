import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { can, getMembership } from "@/lib/business";
import { Announcement } from "@/models/Announcement";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { logBusinessAction } from "@/lib/businessLog";
import { reportError } from "@/lib/errorLog";

type OrgFollow = { followsOfficial?: boolean; followedOfficialAt?: Date };

/**
 * The AutoMarket Official feed for business members. Everyone in a business can read it; the posts that are new
 * since the user last looked come back flagged `unread`. Opening it with `?seen=1` marks them read.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });

    const [org, user, announcements, followers] = await Promise.all([
      Organization.findById(member.organizationId).select("followsOfficial followedOfficialAt").lean<OrgFollow>(),
      User.findById(session.user.id).select("officialSeenAt").lean<{ officialSeenAt?: Date }>(),
      Announcement.find().sort({ pinned: -1, createdAt: -1 }).limit(100).select("-createdBy").lean<Array<{ createdAt: Date }>>(),
      Organization.countDocuments({ followsOfficial: true }),
    ]);
    const following = !!org?.followsOfficial;
    const since = Math.max(user?.officialSeenAt?.getTime() ?? 0, org?.followedOfficialAt?.getTime() ?? 0);
    const feed = announcements.map(a => ({ ...a, unread: following && new Date(a.createdAt).getTime() > since }));
    if (req.nextUrl.searchParams.get("seen") === "1" && following) {
      await User.updateOne({ _id: session.user.id }, { $set: { officialSeenAt: new Date() } });
    }
    return NextResponse.json({ following, followedAt: org?.followedOfficialAt ?? null, followers, canChange: can(member.role, "manageTeam"), announcements: feed });
  } catch (error) {
    reportError("Official feed GET error:", error);
    return NextResponse.json({ error: "Failed to load updates" }, { status: 500 });
  }
}

/** Follows or unfollows the channel for the whole business: { follow: boolean } (owner or manager). */
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!can(member.role, "manageTeam")) return NextResponse.json({ error: "Only the owner or a manager can change this" }, { status: 403 });
    const { follow } = await req.json().catch(() => ({}));
    if (typeof follow !== "boolean") return NextResponse.json({ error: "Say whether to follow" }, { status: 400 });

    const org = await Organization.findById(member.organizationId).select("followsOfficial");
    if (!org) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!!org.followsOfficial !== follow) {
      org.followsOfficial = follow;
      if (follow) org.followedOfficialAt = new Date();
      await org.save();
      await logBusinessAction({ userId: session.user.id, organizationId: member.organizationId }, follow ? "business.followOfficial" : "business.unfollowOfficial",
        { type: "BUSINESS", id: new mongoose.Types.ObjectId(String(member.organizationId)), label: "AutoMarket Official" });
    }
    return NextResponse.json({ following: follow });
  } catch (error) {
    reportError("Official follow PATCH error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
