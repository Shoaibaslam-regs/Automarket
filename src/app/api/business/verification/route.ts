import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { getMembership } from "@/lib/business";
import { getSupportAdmin, sendChatMessage } from "@/lib/support";
import { badgeRequestText } from "@/lib/supportContact";
import { VERIFIED_BADGE, badgeState, type BadgeVerification } from "@/lib/plans";
import { rateLimitResponse } from "@/lib/rateLimit";
import { reportError } from "@/lib/errorLog";

import { openTeamRequest } from "@/lib/teamRequests";
type OrgBadge = {
  _id: { toString(): string };
  name: string;
  slug: string;
  verification?: BadgeVerification;
};

/** The caller's business and its Verified badge status, for the pricing page. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) {
      // getMembership refuses suspended businesses, so tell those apart from people with no business
      const user = await User.findById(session.user.id).select("organizationId").lean<{ organizationId?: unknown }>();
      return NextResponse.json({ business: null, suspended: !!user?.organizationId });
    }
    const org = await Organization.findById(member.organizationId).select("name slug verification").lean<OrgBadge>();
    if (!org) return NextResponse.json({ business: null, suspended: false });
    const v = org.verification ?? {};
    const admin = await getSupportAdmin();
    return NextResponse.json({
      business: { id: org._id.toString(), name: org.name, slug: org.slug },
      isOwner: member.role === "OWNER",
      supportUserId: admin ? admin._id.toString() : null,
      state: badgeState(v),
      verification: {
        verifiedAt: v.verifiedAt ?? null,
        expiresAt: v.expiresAt ?? null,
        source: v.source ?? null,
        requestedAt: v.requestedAt ?? null,
        rejectedAt: v.rejectedAt ?? null,
        rejectionReason: v.rejectionReason ?? null,
      },
    });
  } catch (error) {
    reportError("Verification status error:", error);
    return NextResponse.json({ error: "Failed to load badge status" }, { status: 500 });
  }
}

/**
 * The owner asks for the Verified badge (or a renewal). Records an open request that admins see in the
 * Businesses tab, and messages the support admin so they can reply with payment details.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const limited = await rateLimitResponse("support", session.user.id, "requests");
    if (limited) return limited;
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "The Verified badge is for businesses. Set up your business first." }, { status: 403 });
    if (member.role !== "OWNER") return NextResponse.json({ error: "Only the business owner can request the Verified badge" }, { status: 403 });

    const admin = await getSupportAdmin();
    if (!admin) return NextResponse.json({ error: "The support team isn't available right now. Please try again later." }, { status: 503 });
    if (admin._id.equals(session.user.id)) {
      return NextResponse.json({ error: "You're the support admin; verify the business from the admin panel." }, { status: 400 });
    }

    const org = await Organization.findById(member.organizationId).select("name verification").lean<OrgBadge>();
    if (!org) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    const supportUserId = admin._id.toString();
    // One open request at a time; clicking again just reopens the conversation
    if (org.verification?.requestedAt) return NextResponse.json({ supportUserId, alreadyRequested: true });

    await Organization.updateOne(
      { _id: member.organizationId },
      { $set: { "verification.requestedAt": new Date(), "verification.requestedBy": session.user.id } }
    );
    await openTeamRequest({ kind: "BADGE", userId: session.user.id, organizationId: member.organizationId, price: VERIFIED_BADGE.price });
    const me = await User.findById(session.user.id).select("email").lean<{ email: string }>();
    await sendChatMessage(
      session.user.id,
      supportUserId,
      badgeRequestText(org.name, VERIFIED_BADGE.price, { id: session.user.id, email: me?.email, business: { id: String(member.organizationId), name: org.name } }),
      session.user.name
    );
    return NextResponse.json({ supportUserId }, { status: 201 });
  } catch (error) {
    reportError("Verification request error:", error);
    return NextResponse.json({ error: "Failed to send your request" }, { status: 500 });
  }
}
