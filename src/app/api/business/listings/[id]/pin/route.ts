import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { Organization } from "@/models/Organization";
import { can, getMembership, getOrgUserIds } from "@/lib/business";
import { getSubscription, subscriptionHas } from "@/lib/subscription";
import { planFor } from "@/lib/plans";
import { invalidateBusinessSlug } from "@/lib/pageCache";
import { logBusinessAction } from "@/lib/businessLog";
import { rateLimitResponse } from "@/lib/rateLimit";
import { reportError } from "@/lib/errorLog";

/**
 * Pins one of the business's vehicles first on its shop page, or unpins it: `{ pinned: boolean }`. Owners and
 * managers, on a plan with pinned vehicles (PLAN_FEATURES.pinnedVehicles, Premium Plus and up). No limit on how many.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await rateLimitResponse("boosts", session.user.id, "changes");
  if (limited) return limited;
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    if (typeof body?.pinned !== "boolean") return NextResponse.json({ error: "Choose pin or unpin" }, { status: 400 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "Pinning is for businesses" }, { status: 403 });
    if (!can(member.role, "promote")) return NextResponse.json({ error: "Only the owner or a manager can pin vehicles" }, { status: 403 });
    if (!subscriptionHas(await getSubscription(session.user.id), "pinnedVehicles")) {
      const plan = planFor("pinnedVehicles").name;
      return NextResponse.json({ error: `Pinned vehicles come with ${plan} and up`, code: "PLAN_FEATURE", plan }, { status: 403 });
    }
    const listing = await Listing.findOneAndUpdate(
      { _id: id, sellerId: { $in: await getOrgUserIds(member.organizationId) } },
      body.pinned ? { $set: { pinnedAt: new Date() } } : { $unset: { pinnedAt: 1 } },
      { returnDocument: "after" }
    ).select("title pinnedAt").lean<{ _id: mongoose.Types.ObjectId; title: string; pinnedAt?: Date }>();
    if (!listing) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    const org = await Organization.findById(member.organizationId).select("slug").lean<{ slug: string }>();
    if (org) invalidateBusinessSlug(org.slug);
    await logBusinessAction({ userId: session.user.id, organizationId: member.organizationId }, body.pinned ? "listing.pin" : "listing.unpin",
      { type: "LISTING", id: listing._id, label: listing.title });
    return NextResponse.json({ pinnedAt: listing.pinnedAt ?? null });
  } catch (error) {
    reportError("Pin vehicle error:", error);
    return NextResponse.json({ error: "Couldn't change the pin" }, { status: 500 });
  }
}
