// Server-only. Opens and closes plan and badge requests (src/models/TeamRequest.ts, shown in Admin → Requests).
import mongoose from "mongoose";
import { TeamRequest } from "@/models/TeamRequest";
import { reportError } from "@/lib/errorLog";

type Id = string | mongoose.Types.ObjectId;

/** Records a request, or leaves the one already waiting (one per person and kind; a new plan choice replaces the old). Never throws. */
export async function openTeamRequest(r: { kind: "PLAN" | "BADGE"; userId: Id; organizationId?: Id | null; plan?: string; price: number }) {
  try {
    await TeamRequest.findOneAndUpdate(
      r.kind === "BADGE" && r.organizationId
        ? { kind: "BADGE", status: "WAITING", organizationId: r.organizationId }
        : { kind: r.kind, status: "WAITING", userId: r.userId },
      { $set: { userId: r.userId, ...(r.organizationId ? { organizationId: r.organizationId } : {}), plan: r.plan, price: r.price }, $setOnInsert: { kind: r.kind, status: "WAITING" } },
      { upsert: true }
    );
  } catch (e) {
    reportError("Open team request failed:", e);
  }
}

/**
 * Closes the waiting requests the admin just dealt with (activating a plan for a user, approving or refusing a
 * business's badge), wherever it was done. Never throws.
 */
export async function closeTeamRequests(
  match: { kind: "PLAN"; userId: Id } | { kind: "BADGE"; organizationId: Id },
  done: { adminId: Id; status: "DONE" | "REFUSED"; outcome: string }
) {
  try {
    await TeamRequest.updateMany(
      { ...match, status: "WAITING" },
      { $set: { status: done.status, handledBy: done.adminId, handledAt: new Date(), outcome: done.outcome.slice(0, 500) } }
    );
  } catch (e) {
    reportError("Close team request failed:", e);
  }
}
