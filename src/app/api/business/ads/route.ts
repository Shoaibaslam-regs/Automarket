import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Ad } from "@/models/Ad";
import { Deal } from "@/models/Deal";
import { Listing } from "@/models/Listing";
import { Organization } from "@/models/Organization";
import { getMembership, getOrgUserIds, can } from "@/lib/business";
import { liveQuery } from "@/lib/publicDeals";
import { SPONSORED_AD, adPrice } from "@/lib/plans";
import { AD_KIND_LABEL, type AdKind } from "@/lib/ads";
import { getSupportAdmin, sendChatMessage } from "@/lib/support";
import { logBusinessAction } from "@/lib/businessLog";
import { rateLimitResponse } from "@/lib/rateLimit";

type Oid = mongoose.Types.ObjectId;

/** What the business can promote: its live deals and its team's active listings. */
async function promotable(orgId: Oid) {
  const sellerIds = await getOrgUserIds(orgId);
  const [deals, listings] = await Promise.all([
    Deal.find({ organizationId: orgId, ...liveQuery(new Date()) }).sort({ createdAt: -1 }).select("title").limit(100).lean<Array<{ _id: Oid; title: string }>>(),
    Listing.find({ sellerId: { $in: sellerIds }, status: "ACTIVE" }).sort({ createdAt: -1 }).select("title").limit(200).lean<Array<{ _id: Oid; title: string }>>(),
  ]);
  return { deals, listings };
}

/** The business's ad requests and ads, plus what it can promote. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No business found" }, { status: 403 });
    const [ads, org, options] = await Promise.all([
      Ad.find({ organizationId: member.organizationId }).sort({ createdAt: -1 }).limit(100).lean(),
      Organization.findById(member.organizationId).select("name slug").lean<{ name: string; slug: string }>(),
      promotable(member.organizationId),
    ]);
    return NextResponse.json({ ads, business: org, options, canPromote: can(member.role, "promote") });
  } catch (error) {
    console.error("Business ads GET error:", error);
    return NextResponse.json({ error: "Failed to load ads" }, { status: 500 });
  }
}

/** Asks for a sponsored ad. Body: { kind, targetId?, weeks, paymentRef, note? }. Messages the support admin. */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const limited = await rateLimitResponse("support", session.user.id, "requests");
    if (limited) return limited;
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "Sponsored ads are for businesses." }, { status: 403 });
    if (!can(member.role, "promote")) return NextResponse.json({ error: "Only the owner or a manager can ask for ads" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const kind = body.kind as AdKind;
    if (!["SHOP", "DEAL", "LISTING"].includes(kind)) return NextResponse.json({ error: "Choose what to promote" }, { status: 400 });
    const weeks = Number(body.weeks);
    if (!(SPONSORED_AD.weeks as readonly number[]).includes(weeks)) return NextResponse.json({ error: "Choose how long the ad runs" }, { status: 400 });
    const paymentRef = typeof body.paymentRef === "string" ? body.paymentRef.trim().slice(0, 200) : "";
    if (paymentRef.length < 3) return NextResponse.json({ error: "Enter the transaction ID or the number you paid from" }, { status: 400 });
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";

    const org = await Organization.findById(member.organizationId).select("name").lean<{ name: string }>();
    if (!org) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    let targetId: Oid | undefined;
    let targetLabel = org.name;
    if (kind !== "SHOP") {
      const id = String(body.targetId || "");
      const { deals, listings } = await promotable(member.organizationId);
      const item = (kind === "DEAL" ? deals : listings).find(x => String(x._id) === id);
      if (!item) return NextResponse.json({ error: kind === "DEAL" ? "Pick one of your running deals" : "Pick one of your active vehicles" }, { status: 400 });
      targetId = item._id;
      targetLabel = item.title;
    }

    const open = await Ad.countDocuments({ organizationId: member.organizationId, status: "REQUESTED" });
    if (open >= 5) return NextResponse.json({ error: "You already have 5 requests waiting. Wait for the team to answer them first." }, { status: 400 });

    const price = adPrice(weeks);
    const ad = await Ad.create({
      organizationId: member.organizationId, requestedBy: session.user.id, kind, targetId, targetLabel,
      weeks, price, paymentRef, note: note || undefined,
    });

    const admin = await getSupportAdmin();
    if (admin && !admin._id.equals(session.user.id)) {
      await sendChatMessage(session.user.id, String(admin._id),
        `Hi AutoMarket team, "${org.name}" asked for a sponsored ad: ${AD_KIND_LABEL[kind].toLowerCase()} "${targetLabel}", ${weeks} week${weeks > 1 ? "s" : ""}, PKR ${price.toLocaleString()}. Payment: ${paymentRef}. See Admin → Ad requests.`,
        session.user.name).catch(e => console.error("Ad request message failed:", e));
    }
    await logBusinessAction({ userId: session.user.id, organizationId: member.organizationId }, "ad.request",
      { type: "BUSINESS", id: ad._id, label: targetLabel }, { details: `${weeks} week${weeks > 1 ? "s" : ""} · ${paymentRef}`, amount: price });

    return NextResponse.json({ ad }, { status: 201 });
  } catch (error) {
    console.error("Business ads POST error:", error);
    return NextResponse.json({ error: "Failed to send your request" }, { status: 500 });
  }
}
