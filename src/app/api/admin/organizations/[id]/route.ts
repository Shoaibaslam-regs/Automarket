import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdminApi } from "@/lib/adminAuth";
import { Organization } from "@/models/Organization";
import { Listing } from "@/models/Listing";
import { Message } from "@/models/Message";
import { getOrgUserIds } from "@/lib/business";
import { triggerPusher } from "@/lib/support";
import { isVerified } from "@/lib/plans";
import { invalidateBusinessSlug, invalidateListingPage } from "@/lib/pageCache";
import { logAdminAction } from "@/lib/adminLog";
import { reportError } from "@/lib/errorLog";

const BADGE_MONTHS = [1, 3, 6, 12];
const fmtDate = (d: Date) => d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

/** Tells the owner in Messages, from the acting admin, so they can reply there to appeal. */
async function notifyOwner(adminId: mongoose.Types.ObjectId, ownerId: mongoose.Types.ObjectId, content: string) {
  if (adminId.equals(ownerId)) return;
  try {
    const message = await Message.create({ senderId: adminId, receiverId: ownerId, content });
    const populated = await Message.findById(message._id).populate("senderId", "name image").populate("receiverId", "name image").lean();
    await triggerPusher(`chat-${[String(adminId), String(ownerId)].sort().join("-")}`, "new-message", populated);
    await triggerPusher(`user-${ownerId}`, "new-notification", { type: "message", from: "AutoGO", preview: content.slice(0, 50) });
  } catch (e) {
    reportError("Suspension notice failed:", e);
  }
}

/**
 * Warns, suspends or reinstates a business, or manages its Verified badge.
 * Body: { action: "warn", reason } | { action: "suspend", reason } | { action: "reinstate" }
 *     | { action: "verify", months: 1 | 3 | 6 | 12 | null, source: "PAID" | "ADMIN_GRANT" }
 *     | { action: "rejectVerification", reason } | { action: "unverify", reason? }.
 * A warning is optional: it only records the notice and messages the owner.
 * Suspending hides the business's live listings (remembered, so reinstating switches back on exactly
 * those), takes its public page offline and locks its console apart from Help & support.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi("write");
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    const { action, reason, months, source } = await req.json().catch(() => ({}));
    const org = await Organization.findById(id);
    if (!org) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    const memberIds = await getOrgUserIds(org._id);

    if (action === "warn") {
      const why = typeof reason === "string" ? reason.trim() : "";
      if (why.length < 5 || why.length > 500) return NextResponse.json({ error: "Give a reason of 5 to 500 characters" }, { status: 400 });
      if (org.isActive === false) return NextResponse.json({ error: "This business is already suspended" }, { status: 400 });
      org.warnings.push({ reason: why, at: new Date(), by: gate.admin._id });
      await org.save();
      const count = org.warnings.length;
      await notifyOwner(gate.admin._id, org.ownerId,
        `Warning ${count > 1 ? `#${count} ` : ""}for your business "${org.name}" on AutoGO: ${why}. ` +
        `Please fix this to avoid a suspension. Reply here if you have questions.`);
      invalidateBusinessSlug(org.slug);
      await logAdminAction(gate.admin, "business.warn", { type: "BUSINESS", id: org._id, label: org.name }, why);
      return NextResponse.json({ ok: true, warnings: count });
    }

    if (action === "suspend") {
      const why = typeof reason === "string" ? reason.trim() : "";
      if (why.length < 5 || why.length > 500) return NextResponse.json({ error: "Give a reason of 5 to 500 characters" }, { status: 400 });
      if (org.isActive === false) return NextResponse.json({ error: "This business is already suspended" }, { status: 400 });

      const live = await Listing.find({ sellerId: { $in: memberIds }, status: "ACTIVE" }).distinct("_id");
      await Listing.updateMany({ _id: { $in: live } }, { $set: { status: "INACTIVE" } });
      live.forEach(invalidateListingPage);
      org.isActive = false;
      org.suspension = { reason: why, at: new Date(), by: gate.admin._id, listingIds: live };
      await org.save();

      await notifyOwner(gate.admin._id, org.ownerId,
        `Your business "${org.name}" has been suspended on AutoGO. Reason: ${why}. ` +
        `Its ${live.length} live listing${live.length !== 1 ? "s are" : " is"} hidden and its public page is offline. Reply here if you'd like to appeal.`);
      invalidateBusinessSlug(org.slug);
      await logAdminAction(gate.admin, "business.suspend", { type: "BUSINESS", id: org._id, label: org.name }, `${why} (${live.length} listing${live.length !== 1 ? "s" : ""} hidden)`);
      return NextResponse.json({ ok: true, hiddenListings: live.length });
    }

    if (action === "reinstate") {
      if (org.isActive !== false) return NextResponse.json({ error: "This business isn't suspended" }, { status: 400 });
      const toRestore = org.suspension?.listingIds ?? [];
      // Only listings still inactive come back; anything the business has since sold or deleted stays as it is
      const restored = await Listing.updateMany({ _id: { $in: toRestore }, status: "INACTIVE" }, { $set: { status: "ACTIVE" } });
      toRestore.forEach(invalidateListingPage);
      org.isActive = true;
      org.suspension = undefined;
      await org.save();

      await notifyOwner(gate.admin._id, org.ownerId,
        `Good news: your business "${org.name}" has been reinstated on AutoGO. Your public page is back and ${restored.modifiedCount} listing${restored.modifiedCount !== 1 ? "s are" : " is"} live again.`);
      invalidateBusinessSlug(org.slug);
      await logAdminAction(gate.admin, "business.reinstate", { type: "BUSINESS", id: org._id, label: org.name }, `${restored.modifiedCount} listing${restored.modifiedCount !== 1 ? "s" : ""} restored`);
      return NextResponse.json({ ok: true, restoredListings: restored.modifiedCount });
    }

    if (action === "verify") {
      if (months !== null && !BADGE_MONTHS.includes(months)) return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
      if (source !== "PAID" && source !== "ADMIN_GRANT") return NextResponse.json({ error: "Say whether it was paid or a gift" }, { status: 400 });
      const now = new Date();
      const current = org.verification;
      const renewing = isVerified(current);
      let expiresAt: Date | undefined;
      if (months !== null) {
        // A renewal adds the months on top of the time still left
        expiresAt = new Date(renewing && current?.expiresAt ? current.expiresAt : now);
        expiresAt.setMonth(expiresAt.getMonth() + months);
      }
      org.verification = {
        verifiedAt: renewing && current?.verifiedAt ? current.verifiedAt : now,
        expiresAt,
        source,
        by: gate.admin._id,
      };
      await org.save();
      await notifyOwner(gate.admin._id, org.ownerId,
        `Your business "${org.name}" is now Verified on AutoGO${source === "ADMIN_GRANT" ? " (complimentary)" : ""}. ` +
        `The Verified badge shows on your business page and listings${expiresAt ? ` until ${fmtDate(expiresAt)}` : ""}.`);
      invalidateBusinessSlug(org.slug);
      await logAdminAction(gate.admin, "business.verify", { type: "BUSINESS", id: org._id, label: org.name }, `${source === "PAID" ? "Paid" : "Gift"}${expiresAt ? `, until ${fmtDate(expiresAt)}` : ""}`);
      return NextResponse.json({ ok: true, expiresAt: expiresAt ?? null });
    }

    if (action === "rejectVerification") {
      const why = typeof reason === "string" ? reason.trim() : "";
      if (why.length < 5 || why.length > 500) return NextResponse.json({ error: "Give a reason of 5 to 500 characters" }, { status: 400 });
      if (!org.verification?.requestedAt) return NextResponse.json({ error: "This business has no open badge request" }, { status: 400 });
      org.verification.requestedAt = undefined;
      org.verification.requestedBy = undefined;
      org.verification.rejectedAt = new Date();
      org.verification.rejectionReason = why;
      await org.save();
      await notifyOwner(gate.admin._id, org.ownerId,
        `Your Verified badge request for "${org.name}" wasn't approved. Reason: ${why}. You can request it again once that's sorted. Reply here if you have questions.`);
      invalidateBusinessSlug(org.slug);
      await logAdminAction(gate.admin, "business.rejectVerification", { type: "BUSINESS", id: org._id, label: org.name }, why);
      return NextResponse.json({ ok: true });
    }

    if (action === "unverify") {
      if (!org.verification?.verifiedAt) return NextResponse.json({ error: "This business doesn't have the Verified badge" }, { status: 400 });
      const why = typeof reason === "string" ? reason.trim().slice(0, 500) : "";
      org.verification.verifiedAt = undefined;
      org.verification.expiresAt = undefined;
      org.verification.source = undefined;
      org.verification.by = undefined;
      await org.save();
      await notifyOwner(gate.admin._id, org.ownerId,
        `The Verified badge has been removed from your business "${org.name}" on AutoGO${why ? `. Reason: ${why}` : ""}. Reply here if you have questions.`);
      invalidateBusinessSlug(org.slug);
      await logAdminAction(gate.admin, "business.unverify", { type: "BUSINESS", id: org._id, label: org.name }, why || undefined);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    reportError("Business update error:", error);
    return NextResponse.json({ error: "Failed to update business" }, { status: 500 });
  }
}
