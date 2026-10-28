import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdminApi } from "@/lib/adminAuth";
import { adminCan } from "@/lib/adminRoles";
import { TeamRequest } from "@/models/TeamRequest";
import { Organization } from "@/models/Organization";
import { sendAsSupport } from "@/lib/support";
import { logAdminAction } from "@/lib/adminLog";
import { invalidateBusinessSlug } from "@/lib/pageCache";
import { PLANS, isPlanId } from "@/lib/plans";
import { reportError } from "@/lib/errorLog";

/**
 * A plan or badge request in Admin → Requests. Body: { action: "take" } marks it as yours, so other admins see who is
 * on it; { action: "refuse", reason } closes it and tells the person in Messages (a badge refusal also clears the
 * business's open badge request). Activating is done with the normal plan and badge actions, which close it.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    const request = await TeamRequest.findById(id);
    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (!adminCan(gate.admin.adminAccess, request.kind === "PLAN" ? "plans" : "badges")) {
      return NextResponse.json({ error: "Your admin role can't handle this request" }, { status: 403 });
    }
    if (request.status !== "WAITING") return NextResponse.json({ error: "This request was already dealt with" }, { status: 409 });
    const { action, reason } = (await req.json().catch(() => ({}))) ?? {};
    const plan = request.plan;
    const planName = isPlanId(plan) ? PLANS[plan].name : "Plan";
    const label = request.kind === "PLAN" ? `${planName} request` : "Verified badge request";

    if (action === "take") {
      await TeamRequest.updateOne({ _id: request._id, status: "WAITING" }, { $set: { takenBy: gate.admin._id, takenAt: new Date() } });
      await logAdminAction(gate.admin, "request.take", { type: "REQUEST", id: request._id, label });
      return NextResponse.json({ ok: true });
    }

    if (action === "refuse") {
      const why = typeof reason === "string" ? reason.trim() : "";
      if (why.length < 5 || why.length > 500) return NextResponse.json({ error: "Give a reason of 5 to 500 characters" }, { status: 400 });
      // Only one admin closes it
      const closed = await TeamRequest.findOneAndUpdate(
        { _id: request._id, status: "WAITING" },
        { $set: { status: "REFUSED", handledBy: gate.admin._id, handledAt: new Date(), outcome: why } },
        { returnDocument: "after" }
      );
      if (!closed) return NextResponse.json({ error: "This request was already dealt with" }, { status: 409 });
      let text = `Your ${label.toLowerCase()} wasn't approved. Reason: ${why}. Reply here if you have questions.`;
      if (request.kind === "BADGE" && request.organizationId) {
        const org = await Organization.findById(request.organizationId);
        if (org?.verification?.requestedAt) {
          org.verification.requestedAt = undefined;
          org.verification.requestedBy = undefined;
          org.verification.rejectedAt = new Date();
          org.verification.rejectionReason = why;
          await org.save();
          invalidateBusinessSlug(org.slug);
        }
        if (org) text = `Your Verified badge request for "${org.name}" wasn't approved. Reason: ${why}. You can request it again once that's sorted. Reply here if you have questions.`;
      }
      await sendAsSupport(gate.admin._id, request.userId, text).catch(e => reportError("Request refusal message failed:", e));
      await logAdminAction(gate.admin, "request.refuse", { type: "REQUEST", id: request._id, label }, why);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    reportError("Admin request PATCH error:", error);
    return NextResponse.json({ error: "Failed to update the request" }, { status: 500 });
  }
}
