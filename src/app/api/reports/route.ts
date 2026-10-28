import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Report } from "@/models/Report";
import { Listing } from "@/models/Listing";
import { Deal } from "@/models/Deal";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { maybeAutoHide } from "@/lib/reportAutoHide";
import { REPORT_REASONS } from "@/lib/reports";
import { rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { triggerPusher } from "@/lib/support";
import { reportError } from "@/lib/errorLog";

import { turnstileRefusal, verifyTurnstile } from "@/lib/turnstile";
type Oid = mongoose.Types.ObjectId;

/**
 * Reports a listing, deal or business to the admins. Body: { targetType, targetId, reason, details? }.
 * One open report per user per item; people can't report their own listings or business.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Sign in to report this" }, { status: 401 });
    const limited = await rateLimitResponse("reports", session.user.id, "reports");
    if (limited) return limited;

    const { targetType, targetId, reason, details, cf } = await req.json().catch(() => ({}));
    if (!(await verifyTurnstile(cf, clientIp(req)))) return turnstileRefusal();
    if (!["LISTING", "DEAL", "BUSINESS"].includes(targetType) || !mongoose.Types.ObjectId.isValid(String(targetId))) {
      return NextResponse.json({ error: "Nothing to report" }, { status: 400 });
    }
    if (!REPORT_REASONS.some(r => r.id === reason)) return NextResponse.json({ error: "Choose what's wrong" }, { status: 400 });
    const text = typeof details === "string" ? details.trim().slice(0, 1000) : "";
    if (reason === "OTHER" && text.length < 10) return NextResponse.json({ error: "Tell us what's wrong in a few words" }, { status: 400 });

    await connectDB();
    const me = new mongoose.Types.ObjectId(session.user.id);
    const myOrg = (await User.findById(me).select("organizationId").lean<{ organizationId?: Oid }>())?.organizationId;

    // Find the item, its business, and make sure it isn't the reporter's own
    let label = "";
    let organizationId: Oid | undefined;
    let own = false;
    if (targetType === "LISTING") {
      const l = await Listing.findById(targetId).select("title sellerId").lean<{ title: string; sellerId: Oid }>();
      if (!l) return NextResponse.json({ error: "This listing no longer exists" }, { status: 404 });
      label = l.title;
      organizationId = (await User.findById(l.sellerId).select("organizationId").lean<{ organizationId?: Oid }>())?.organizationId;
      own = l.sellerId.equals(me) || (!!myOrg && !!organizationId && myOrg.equals(organizationId));
    } else if (targetType === "DEAL") {
      const d = await Deal.findById(targetId).select("title organizationId").lean<{ title: string; organizationId: Oid }>();
      if (!d) return NextResponse.json({ error: "This deal no longer exists" }, { status: 404 });
      label = d.title;
      organizationId = d.organizationId;
      own = !!myOrg && myOrg.equals(d.organizationId);
    } else {
      const o = await Organization.findById(targetId).select("name").lean<{ _id: Oid; name: string }>();
      if (!o) return NextResponse.json({ error: "This business no longer exists" }, { status: 404 });
      label = o.name;
      organizationId = o._id;
      own = !!myOrg && myOrg.equals(o._id);
    }
    if (own) return NextResponse.json({ error: "You can't report your own listing or business" }, { status: 400 });

    if (await Report.exists({ reporterId: me, targetType, targetId, status: "OPEN" })) {
      return NextResponse.json({ error: "You've already reported this. Our team is looking into it." }, { status: 409 });
    }

    await Report.create({ targetType, targetId, targetLabel: label, organizationId, reporterId: me, reason, details: text || undefined });
    // Enough different people reported it: hide it until the team looks
    await maybeAutoHide(targetType, String(targetId));

    // Every admin's Reports badge (and phones that turned alerts on)
    try {
      const admins = await User.find({ role: "ADMIN" }).select("_id").lean<Array<{ _id: unknown }>>();
      await Promise.all(admins.map(a => triggerPusher(`user-${a._id}`, "new-notification", { type: "report" })));
    } catch {}

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    reportError("Report POST error:", error);
    return NextResponse.json({ error: "Couldn't send your report" }, { status: 500 });
  }
}
