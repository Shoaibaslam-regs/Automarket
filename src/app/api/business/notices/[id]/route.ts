import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { can, getMembership } from "@/lib/business";
import { ShopNotice } from "@/models/ShopNotice";
import { Organization } from "@/models/Organization";
import { logBusinessAction } from "@/lib/businessLog";
import { invalidateBusinessSlug } from "@/lib/pageCache";
import { parseShopNotice } from "@/lib/shopNotices";
import { reportError } from "@/lib/errorLog";

type Params = { params: Promise<{ id: string }> };

/** The signed-in owner or manager, their business, and the announcement (only their own business's). */
async function load(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  await connectDB();
  const member = await getMembership(session.user.id);
  if (!member) return { error: NextResponse.json({ error: "No organization" }, { status: 404 }) };
  if (!can(member.role, "announce")) return { error: NextResponse.json({ error: "Only the owner or a manager can change announcements" }, { status: 403 }) };
  if (!mongoose.Types.ObjectId.isValid(id)) return { error: NextResponse.json({ error: "Announcement not found" }, { status: 404 }) };
  const notice = await ShopNotice.findOne({ _id: id, organizationId: member.organizationId });
  if (!notice) return { error: NextResponse.json({ error: "Announcement not found" }, { status: 404 }) };
  return { userId: session.user.id, member, notice };
}

async function clearShopPage(orgId: unknown) {
  const org = await Organization.findById(orgId).select("slug").lean<{ slug: string }>();
  if (org) invalidateBusinessSlug(org.slug);
}

/**
 * Edits an announcement: `{ action: "end" }` takes it off the shop page now; otherwise any of the fields
 * parseShopNotice checks (only the ones sent change), e.g. `{ pinned: true }`.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const got = await load((await params).id);
    if ("error" in got) return got.error;
    const { userId, member, notice } = got;
    const body = (await req.json().catch(() => null)) ?? {};

    if (body.action === "end") {
      notice.endsAt = new Date();
      notice.pinned = false;
      await notice.save();
      await clearShopPage(member.organizationId);
      await logBusinessAction({ userId, organizationId: member.organizationId }, "notice.end", { type: "BUSINESS", id: notice._id, label: notice.title });
      return NextResponse.json({ notice });
    }

    const parsed = parseShopNotice(body, new Date(), true);
    if (parsed.error !== undefined) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const data = parsed.data;
    // An event always needs its date: the one sent, or the one it already has
    const kind = data.kind ?? notice.kind;
    const eventAt = "eventAt" in data ? data.eventAt : notice.eventAt;
    if (kind === "EVENT" && !eventAt) return NextResponse.json({ error: "Choose the event's date and time" }, { status: 400 });
    notice.set(data);
    await notice.save();
    await clearShopPage(member.organizationId);
    await logBusinessAction({ userId, organizationId: member.organizationId }, "notice.edit", { type: "BUSINESS", id: notice._id, label: notice.title });
    return NextResponse.json({ notice });
  } catch (error) {
    reportError("Shop notice PATCH error:", error);
    return NextResponse.json({ error: "Failed to update the announcement" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const got = await load((await params).id);
    if ("error" in got) return got.error;
    const { userId, member, notice } = got;
    await notice.deleteOne();
    await clearShopPage(member.organizationId);
    await logBusinessAction({ userId, organizationId: member.organizationId }, "notice.delete", { type: "BUSINESS", id: notice._id, label: notice.title });
    return NextResponse.json({ ok: true });
  } catch (error) {
    reportError("Shop notice DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete the announcement" }, { status: 500 });
  }
}
