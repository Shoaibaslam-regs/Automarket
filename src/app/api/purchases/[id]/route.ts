import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Purchase } from "@/models/Purchase";
import { Organization } from "@/models/Organization";
import { REMOVABLE_PURCHASE_STATUSES, purchaseNumber } from "@/lib/purchases";
import { triggerPusher } from "@/lib/support";
import { reportError } from "@/lib/errorLog";

async function loadOwn(userId: string, id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Purchase.findOne({ _id: id, buyerId: userId, deletedByBuyer: { $ne: true } });
}

/** One of the buyer's purchases with the business's details, for the buyer's slip. Opening it marks updates seen. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const purchase = await loadOwn(session.user.id, id);
    if (!purchase) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    if (!purchase.seenByBuyer) await Purchase.updateOne({ _id: purchase._id }, { $set: { seenByBuyer: true } });
    const organization = await Organization.findById(purchase.organizationId).select("name phone email address city logo").lean();
    return NextResponse.json({ purchase: purchase.toObject(), organization });
  } catch (error) {
    reportError("Purchase GET error:", error);
    return NextResponse.json({ error: "Failed to load the purchase" }, { status: 500 });
  }
}

/** The buyer cancels a request that isn't sold yet. Body: { action: "cancel" }. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const { action } = await req.json().catch(() => ({}));
    if (action !== "cancel") return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    const purchase = await loadOwn(session.user.id, id);
    if (!purchase) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    if (!["REQUESTED", "ACCEPTED"].includes(purchase.status)) {
      return NextResponse.json({ error: `A ${purchase.status.toLowerCase()} purchase can't be cancelled` }, { status: 400 });
    }
    purchase.status = "CANCELLED";
    purchase.cancelledAt = new Date();
    await purchase.save();
    const org = await Organization.findById(purchase.organizationId).select("ownerId").lean<{ ownerId: unknown }>();
    if (org) await triggerPusher(`user-${org.ownerId}`, "new-notification", { type: "sale", note: `${purchaseNumber(String(purchase._id))} cancelled` });
    return NextResponse.json({ purchase });
  } catch (error) {
    reportError("Purchase PATCH error:", error);
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}

/** The buyer removes a finished purchase from My purchases. The business keeps its record until it removes it too. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const purchase = await loadOwn(session.user.id, id);
    if (!purchase) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    if (!REMOVABLE_PURCHASE_STATUSES.includes(purchase.status)) {
      return NextResponse.json({ error: "Cancel the request first. Only bought, declined or cancelled purchases can be removed" }, { status: 400 });
    }
    // A sold record stays for the business's books; anything else goes once neither side wants it
    if (purchase.status !== "COMPLETED" && purchase.deletedByBusiness) {
      await purchase.deleteOne();
    } else {
      purchase.deletedByBuyer = true;
      purchase.seenByBuyer = true;
      await purchase.save();
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    reportError("Purchase DELETE error:", error);
    return NextResponse.json({ error: "Failed to remove the purchase" }, { status: 500 });
  }
}
