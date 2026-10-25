import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { invalidateSponsored } from "@/lib/pageCache";
import mongoose from "mongoose";
import { requireAdminApi } from "@/lib/adminAuth";
import { Ad } from "@/models/Ad";
import { logAdminAction } from "@/lib/adminLog";
import { sendChatMessage } from "@/lib/support";
import { SPONSORED_AD } from "@/lib/plans";
import { AD_KIND_LABEL, DAY_MS, type AdKind } from "@/lib/ads";
import { topBlockedUntil } from "@/lib/sponsored";
import { reportError } from "@/lib/errorLog";

const day = (d: Date) => d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" });

/** Midnight Pakistan time of a "YYYY-MM-DD" date, or now when the date is today, past or missing. */
function startFrom(value: unknown): Date | null {
  const now = new Date();
  if (!value) return now;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00+05:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.getTime() > now.getTime() ? d : now;
}

/**
 * Handles a sponsored ad. Body: { action: "approve", startsAt? } (payment checked), { action: "reject", reason }
 * or { action: "stop", reason } for an approved ad that hasn't ended. The business is told in Messages.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi("write");
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    const { action, startsAt, reason: rawReason } = await req.json().catch(() => ({}));
    const reason = typeof rawReason === "string" ? rawReason.trim().slice(0, 500) : "";

    const ad = await Ad.findById(id);
    if (!ad) return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    const what = `${AD_KIND_LABEL[ad.kind as AdKind].toLowerCase()} "${ad.targetLabel}"`;
    const now = new Date();
    let message: string;

    if (action === "approve") {
      if (ad.status !== "REQUESTED") return NextResponse.json({ error: "This request was already handled" }, { status: 400 });
      const start = startFrom(startsAt);
      if (!start) return NextResponse.json({ error: "Pick a valid start date" }, { status: 400 });
      const end = new Date(start.getTime() + ad.weeks * 7 * DAY_MS);
      // Standard ads rotate, so any number can run; Top ads are first in their city, so only a few at once there
      if (ad.tier === "TOP") {
        const free = await topBlockedUntil(ad.city, start, ad.weeks, String(ad._id));
        if (free) return NextResponse.json({ error: `${SPONSORED_AD.topPerCity} Top ads are already booked in ${ad.city} for those dates. Start it on ${day(free)} or later.` }, { status: 400 });
      }
      Object.assign(ad, { status: "APPROVED", startsAt: start, endsAt: end, handledBy: gate.admin._id, handledAt: now });
      message = `Your ${ad.tier === "TOP" ? "Top " : ""}sponsored ad for ${what} is approved. It runs from ${day(start)} to ${day(end)}${ad.city ? `, shown first to visitors in ${ad.city}` : ""}. You can see its views and taps in Business → Promote. Thank you!`;
    } else if (action === "reject") {
      if (ad.status !== "REQUESTED") return NextResponse.json({ error: "This request was already handled" }, { status: 400 });
      if (reason.length < 3) return NextResponse.json({ error: "Give a reason, e.g. \"Payment not received\"" }, { status: 400 });
      Object.assign(ad, { status: "REJECTED", reason, handledBy: gate.admin._id, handledAt: now });
      message = `Your sponsored ad request for ${what} was not approved: ${reason}. Reply here if you have questions.`;
    } else if (action === "stop") {
      if (ad.status !== "APPROVED" || (ad.endsAt && ad.endsAt <= now)) return NextResponse.json({ error: "Only running or upcoming ads can be stopped" }, { status: 400 });
      if (reason.length < 3) return NextResponse.json({ error: "Give a reason for stopping it" }, { status: 400 });
      Object.assign(ad, { status: "STOPPED", reason, handledBy: gate.admin._id, handledAt: now });
      message = `Your sponsored ad for ${what} was stopped: ${reason}. Reply here if you have questions.`;
    } else {
      return NextResponse.json({ error: "Choose approve, reject or stop" }, { status: 400 });
    }
    await ad.save();
    revalidatePath("/");
    invalidateSponsored();

    if (!gate.admin._id.equals(ad.requestedBy)) {
      await sendChatMessage(String(gate.admin._id), String(ad.requestedBy), message, "AutoGO").catch(e => reportError("Ad message failed:", e));
    }
    await logAdminAction(gate.admin, `ad.${action}`, { type: "AD", id: ad._id, label: ad.targetLabel },
      action === "approve" ? `${ad.tier === "TOP" ? "Top, " : ""}${ad.city ? `${ad.city}, ` : ""}${ad.weeks} week${ad.weeks > 1 ? "s" : ""}, PKR ${ad.price.toLocaleString()} · ${ad.paymentRef} · ${day(ad.startsAt!)} to ${day(ad.endsAt!)}` : reason);

    return NextResponse.json({ ok: true });
  } catch (error) {
    reportError("Admin ad PATCH error:", error);
    return NextResponse.json({ error: "Failed to update the ad" }, { status: 500 });
  }
}
