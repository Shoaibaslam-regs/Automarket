// Server-only. Hides a listing or deal once REPORTS_TO_HIDE different people have open reports on it, and brings it
// back when the admins dismiss them. `autoHiddenAt` marks what this did, so an admin's own takedown is never undone.
import mongoose from "mongoose";
import { Report } from "@/models/Report";
import { Listing } from "@/models/Listing";
import { Deal } from "@/models/Deal";
import { REPORTS_TO_HIDE } from "@/lib/reports";
import { invalidateDeal, invalidateListingAndSeller } from "@/lib/pageCache";
import { getSupportAccount, sendChatMessage } from "@/lib/support";
import { reportError } from "@/lib/errorLog";

type Oid = mongoose.Types.ObjectId;

/** After a new report: hides the item when enough different people reported it. Never throws. Returns whether it hid it. */
export async function maybeAutoHide(targetType: string, targetId: string): Promise<boolean> {
  try {
    if (targetType !== "LISTING" && targetType !== "DEAL") return false;
    const reporters = await Report.distinct("reporterId", { targetType, targetId, status: "OPEN" });
    if (reporters.length < REPORTS_TO_HIDE) return false;
    const support = await getSupportAccount();
    if (targetType === "LISTING") {
      // Only a live listing the team hasn't already handled
      const listing = await Listing.findOneAndUpdate(
        { _id: targetId, status: "ACTIVE", removedByAdmin: { $ne: true } },
        { $set: { status: "INACTIVE", removedByAdmin: true, autoHiddenAt: new Date(), statusChangedAt: new Date() } },
        { returnDocument: "after" }
      ).select("title sellerId").lean<{ _id: Oid; title: string; sellerId: Oid }>();
      if (!listing) return false;
      await invalidateListingAndSeller(listing._id, listing.sellerId);
      await sendChatMessage(String(support._id), String(listing.sellerId),
        `Your listing "${listing.title}" is hidden for now because several people reported it. The AutoGO team will check it soon. Reply here if you think it's a mistake.`, "AutoGO Support");
      return true;
    }
    const deal = await Deal.findOneAndUpdate(
      { _id: targetId, disabledByAdmin: { $ne: true } },
      { $set: { disabledByAdmin: true, autoHiddenAt: new Date() } },
      { returnDocument: "after" }
    ).select("title organizationId createdBy").lean<{ _id: Oid; title: string; organizationId: Oid; createdBy?: Oid }>();
    if (!deal) return false;
    await invalidateDeal(deal._id, deal.organizationId);
    return true;
  } catch (e) {
    reportError("Auto-hide after reports failed:", e);
    return false;
  }
}

/**
 * After admins dismiss reports: an item hidden by reports comes back once no open report is left on it. A takedown an
 * admin chose (no `autoHiddenAt`) stays. Never throws.
 */
export async function maybeRestore(targetType: string, targetId: Oid | string) {
  try {
    if (targetType !== "LISTING" && targetType !== "DEAL") return;
    if (await Report.exists({ targetType, targetId, status: "OPEN" })) return;
    if (targetType === "LISTING") {
      const listing = await Listing.findOneAndUpdate(
        { _id: targetId, autoHiddenAt: { $exists: true }, status: "INACTIVE" },
        { $set: { status: "ACTIVE", statusChangedAt: new Date() }, $unset: { removedByAdmin: "", autoHiddenAt: "" } },
        { returnDocument: "after" }
      ).select("sellerId").lean<{ _id: Oid; sellerId: Oid }>();
      if (listing) await invalidateListingAndSeller(listing._id, listing.sellerId);
      return;
    }
    const deal = await Deal.findOneAndUpdate(
      { _id: targetId, autoHiddenAt: { $exists: true } },
      { $set: { disabledByAdmin: false }, $unset: { autoHiddenAt: "" } },
      { returnDocument: "after" }
    ).select("organizationId").lean<{ _id: Oid; organizationId: Oid }>();
    if (deal) await invalidateDeal(deal._id, deal.organizationId);
  } catch (e) {
    reportError("Restore after dismissed reports failed:", e);
  }
}

/** When an admin resolves the reports (acted on them), the item stays hidden as their decision. */
export async function keepHidden(targetType: string, targetId: Oid | string) {
  try {
    if (targetType === "LISTING") await Listing.updateOne({ _id: targetId }, { $unset: { autoHiddenAt: "" } });
    else if (targetType === "DEAL") await Deal.updateOne({ _id: targetId }, { $unset: { autoHiddenAt: "" } });
  } catch (e) {
    reportError("Keep hidden after reports failed:", e);
  }
}
