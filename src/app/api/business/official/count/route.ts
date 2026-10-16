import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { unreadOfficialCount } from "@/lib/official";

/** Unread AutoMarket Official posts for the nav badge; 0 for people without a following business. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ count: 0 });
    await connectDB();
    const user = await User.findById(session.user.id).select("organizationId officialSeenAt").lean<{ organizationId?: unknown; officialSeenAt?: Date }>();
    if (!user?.organizationId) return NextResponse.json({ count: 0 });
    const org = await Organization.findOne({ _id: user.organizationId, isActive: true }).select("followsOfficial followedOfficialAt").lean<{ followsOfficial?: boolean; followedOfficialAt?: Date }>();
    return NextResponse.json({ count: org ? await unreadOfficialCount(user, org) : 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
