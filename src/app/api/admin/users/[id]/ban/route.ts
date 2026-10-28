import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { isPlatformOwner, requireAdminApi } from "@/lib/adminAuth";
import { User } from "@/models/User";
import { Listing } from "@/models/Listing";
import { PushSubscription } from "@/models/PushSubscription";
import { newSessionKey } from "@/lib/accountTokens";
import { logAdminAction } from "@/lib/adminLog";
import { invalidateListingAndSeller } from "@/lib/pageCache";
import { sendAccountBannedEmail } from "@/lib/email";
import { reportError } from "@/lib/errorLog";

type Oid = mongoose.Types.ObjectId;

async function target(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return User.findById(id).select("name email role isSupportAccount bannedAt banListingIds")
    .lean<{ _id: Oid; name?: string; email: string; role: string; isSupportAccount?: boolean; bannedAt?: Date; banListingIds?: Oid[] }>();
}

/**
 * Bans a personal account (full admins only). Body: { reason }. They're signed out within minutes (new session key)
 * and can't sign in again, by password or Google; their live listings are hidden (remembered, so unbanning brings
 * back exactly those) and they get an email. Admins must be removed as admins first; the owner can't be banned.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi("users");
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    const user = await target(id);
    if (!user || user.isSupportAccount) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (gate.admin._id.equals(user._id) || isPlatformOwner(user.email)) return NextResponse.json({ error: "This account can't be banned" }, { status: 403 });
    if (user.role === "ADMIN") return NextResponse.json({ error: "Remove them as an admin first" }, { status: 400 });
    if (user.bannedAt) return NextResponse.json({ error: "This account is already banned" }, { status: 409 });
    const { reason } = (await req.json().catch(() => ({}))) ?? {};
    const why = typeof reason === "string" ? reason.trim() : "";
    if (why.length < 5 || why.length > 500) return NextResponse.json({ error: "Give a reason of 5 to 500 characters" }, { status: 400 });

    const live = await Listing.find({ sellerId: user._id, status: "ACTIVE" }).select("_id").lean<Array<{ _id: Oid }>>();
    await Listing.updateMany({ _id: { $in: live.map(l => l._id) } }, { $set: { status: "INACTIVE", removedByAdmin: true, statusChangedAt: new Date() } });
    await User.updateOne({ _id: user._id }, {
      $set: { bannedAt: new Date(), banReason: why, bannedBy: gate.admin._id, banListingIds: live.map(l => l._id), sessionKey: newSessionKey() },
    });
    // No more phone notifications to a banned account
    await PushSubscription.deleteMany({ userId: user._id }).catch(() => {});
    await Promise.all(live.map(l => invalidateListingAndSeller(l._id, user._id)));
    await sendAccountBannedEmail({ to: user.email, name: user.name, reason: why }).catch(e => reportError("Ban email failed:", e));
    await logAdminAction(gate.admin, "user.ban", { type: "USER", id: user._id, label: user.name || user.email }, `${why}${live.length ? ` (${live.length} listing${live.length === 1 ? "" : "s"} hidden)` : ""}`);
    return NextResponse.json({ ok: true, hiddenListings: live.length });
  } catch (error) {
    reportError("Ban user error:", error);
    return NextResponse.json({ error: "Couldn't ban the account" }, { status: 500 });
  }
}

/** Lifts a ban: they can sign in again, and the listings the ban hid come back (unless an admin took one down since). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi("users");
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    const user = await target(id);
    if (!user || user.isSupportAccount) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!user.bannedAt) return NextResponse.json({ error: "This account isn't banned" }, { status: 409 });
    const ids = user.banListingIds ?? [];
    const restored = await Listing.updateMany(
      { _id: { $in: ids }, sellerId: user._id, status: "INACTIVE", removedByAdmin: true, autoHiddenAt: { $exists: false } },
      { $set: { status: "ACTIVE", statusChangedAt: new Date() }, $unset: { removedByAdmin: "" } }
    );
    await User.updateOne({ _id: user._id }, { $unset: { bannedAt: "", banReason: "", bannedBy: "", banListingIds: "" } });
    await Promise.all(ids.map(l => invalidateListingAndSeller(l, user._id)));
    await logAdminAction(gate.admin, "user.unban", { type: "USER", id: user._id, label: user.name || user.email }, restored.modifiedCount ? `${restored.modifiedCount} listing${restored.modifiedCount === 1 ? "" : "s"} back` : undefined);
    return NextResponse.json({ ok: true, restoredListings: restored.modifiedCount });
  } catch (error) {
    reportError("Unban user error:", error);
    return NextResponse.json({ error: "Couldn't lift the ban" }, { status: 500 });
  }
}
