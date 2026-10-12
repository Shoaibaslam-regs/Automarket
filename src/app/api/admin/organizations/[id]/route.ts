import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdminApi } from "@/lib/adminAuth";
import { Organization } from "@/models/Organization";
import { Listing } from "@/models/Listing";
import { Message } from "@/models/Message";
import { getOrgUserIds } from "@/lib/business";
import { triggerPusher } from "@/lib/support";

/** Tells the owner in Messages, from the acting admin, so they can reply there to appeal. */
async function notifyOwner(adminId: mongoose.Types.ObjectId, ownerId: mongoose.Types.ObjectId, content: string) {
  if (adminId.equals(ownerId)) return;
  try {
    const message = await Message.create({ senderId: adminId, receiverId: ownerId, content });
    const populated = await Message.findById(message._id).populate("senderId", "name image").populate("receiverId", "name image").lean();
    await triggerPusher(`chat-${[String(adminId), String(ownerId)].sort().join("-")}`, "new-message", populated);
    await triggerPusher(`user-${ownerId}`, "new-notification", { type: "message", from: "AutoMarket", preview: content.slice(0, 50) });
  } catch (e) {
    console.error("Suspension notice failed:", e);
  }
}

/**
 * Suspends or reinstates a business. Body: { action: "suspend", reason } | { action: "reinstate" }.
 * Suspending hides the business's live listings (remembered, so reinstating switches back on exactly
 * those), takes its public page offline and locks its console apart from Help & support.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi("write");
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    const { action, reason } = await req.json().catch(() => ({}));
    const org = await Organization.findById(id);
    if (!org) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    const memberIds = await getOrgUserIds(org._id);

    if (action === "suspend") {
      const why = typeof reason === "string" ? reason.trim() : "";
      if (why.length < 5 || why.length > 500) return NextResponse.json({ error: "Give a reason of 5 to 500 characters" }, { status: 400 });
      if (org.isActive === false) return NextResponse.json({ error: "This business is already suspended" }, { status: 400 });

      const live = await Listing.find({ sellerId: { $in: memberIds }, status: "ACTIVE" }).distinct("_id");
      await Listing.updateMany({ _id: { $in: live } }, { $set: { status: "INACTIVE" } });
      org.isActive = false;
      org.suspension = { reason: why, at: new Date(), by: gate.admin._id, listingIds: live };
      await org.save();

      await notifyOwner(gate.admin._id, org.ownerId,
        `Your business "${org.name}" has been suspended on AutoMarket. Reason: ${why}. ` +
        `Its ${live.length} live listing${live.length !== 1 ? "s are" : " is"} hidden and its public page is offline. Reply here if you'd like to appeal.`);
      return NextResponse.json({ ok: true, hiddenListings: live.length });
    }

    if (action === "reinstate") {
      if (org.isActive !== false) return NextResponse.json({ error: "This business isn't suspended" }, { status: 400 });
      const toRestore = org.suspension?.listingIds ?? [];
      // Only listings still inactive come back; anything the business has since sold or deleted stays as it is
      const restored = await Listing.updateMany({ _id: { $in: toRestore }, status: "INACTIVE" }, { $set: { status: "ACTIVE" } });
      org.isActive = true;
      org.suspension = undefined;
      await org.save();

      await notifyOwner(gate.admin._id, org.ownerId,
        `Good news: your business "${org.name}" has been reinstated on AutoMarket. Your public page is back and ${restored.modifiedCount} listing${restored.modifiedCount !== 1 ? "s are" : " is"} live again.`);
      return NextResponse.json({ ok: true, restoredListings: restored.modifiedCount });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Business suspension error:", error);
    return NextResponse.json({ error: "Failed to update business" }, { status: 500 });
  }
}
