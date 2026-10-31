import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { can, getMembership } from "@/lib/business";
import { ShopNotice } from "@/models/ShopNotice";
import { Organization } from "@/models/Organization";
import { logBusinessAction } from "@/lib/businessLog";
import { rateLimitResponse } from "@/lib/rateLimit";
import { invalidateBusinessSlug } from "@/lib/pageCache";
import { MAX_SHOP_NOTICES, SHOP_NOTICE_KIND, parseShopNotice, type ShopNoticeKind } from "@/lib/shopNotices";
import { reportError } from "@/lib/errorLog";

type Oid = mongoose.Types.ObjectId;

/** The business's shop announcements (Business → Announcements), newest first. Every member can read them. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    const [notices, org] = await Promise.all([
      ShopNotice.find({ organizationId: member.organizationId }).sort({ createdAt: -1 }).limit(MAX_SHOP_NOTICES)
        .select("kind title body eventAt endsAt link linkLabel pinned createdAt").lean(),
      Organization.findById(member.organizationId).select("slug name").lean<{ slug: string; name: string }>(),
    ]);
    return NextResponse.json({ notices, canEdit: can(member.role, "announce"), shop: org ? { slug: org.slug, name: org.name } : null });
  } catch (error) {
    reportError("Shop notices GET error:", error);
    return NextResponse.json({ error: "Failed to load announcements" }, { status: 500 });
  }
}

/** Posts an announcement on the shop page (owner and managers). Body: see parseShopNotice. */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!can(member.role, "announce")) return NextResponse.json({ error: "Only the owner or a manager can post announcements" }, { status: 403 });
    const limited = await rateLimitResponse("shopNotices", session.user.id, "announcements");
    if (limited) return limited;

    const body = (await req.json().catch(() => null)) ?? {};
    const parsed = parseShopNotice(body);
    if (parsed.error !== undefined) return NextResponse.json({ error: parsed.error }, { status: 400 });

    // Keep at most MAX_SHOP_NOTICES: ended ones make room first; a full list of live ones has to be tidied by hand
    const all = await ShopNotice.find({ organizationId: member.organizationId }).sort({ createdAt: 1 }).select("endsAt").lean<{ _id: Oid; endsAt: Date }[]>();
    if (all.length >= MAX_SHOP_NOTICES) {
      const ended = all.filter(n => n.endsAt.getTime() <= Date.now()).slice(0, all.length - MAX_SHOP_NOTICES + 1);
      if (all.length - ended.length >= MAX_SHOP_NOTICES) {
        return NextResponse.json({ error: `You have ${MAX_SHOP_NOTICES} live announcements. End or delete one first.` }, { status: 409 });
      }
      await ShopNotice.deleteMany({ _id: { $in: ended.map(n => n._id) } });
    }

    const notice = await ShopNotice.create({ ...parsed.data, organizationId: member.organizationId, createdBy: session.user.id });
    const org = await Organization.findById(member.organizationId).select("slug").lean<{ slug: string }>();
    if (org) invalidateBusinessSlug(org.slug);
    await logBusinessAction({ userId: session.user.id, organizationId: member.organizationId }, "notice.post",
      { type: "BUSINESS", id: notice._id, label: notice.title }, { details: SHOP_NOTICE_KIND[notice.kind as ShopNoticeKind].label });
    return NextResponse.json({ notice }, { status: 201 });
  } catch (error) {
    reportError("Shop notices POST error:", error);
    return NextResponse.json({ error: "Failed to post the announcement" }, { status: 500 });
  }
}
