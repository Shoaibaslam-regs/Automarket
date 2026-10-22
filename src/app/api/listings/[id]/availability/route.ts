import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";
import { getMembership, isUserBusinessSuspended } from "@/lib/business";
import { availabilityOptions, AVAILABILITY_LABEL, type Availability } from "@/lib/availability";
import { invalidateListingAndSeller } from "@/lib/pageCache";
import { logBusinessAction } from "@/lib/businessLog";
import { reportError } from "@/lib/errorLog";

/** Business roles that may mark a teammate's vehicle sold, rented or available. */
const TEAM_ROLES = ["OWNER", "MANAGER", "SALES"];

/**
 * Marks a listing available, sold or rented. Body: { status: "ACTIVE" | "SOLD" | "RENTED" }.
 * Allowed for the seller, and for the owner, managers and sales staff of the seller's business.
 * Sold and rented listings stay visible to the public with a tag (see publicStatusQuery).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    await connectDB();

    const listing = await Listing.findById(id).select("sellerId status type title").lean<{ sellerId: mongoose.Types.ObjectId; status: string; type: string; title: string }>();
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    const sellerId = String(listing.sellerId);
    if (sellerId !== session.user.id) {
      const [member, seller] = await Promise.all([
        getMembership(session.user.id),
        User.findById(sellerId).select("organizationId").lean<{ organizationId?: mongoose.Types.ObjectId }>(),
      ]);
      const sameBusiness = !!member && !!seller?.organizationId && member.organizationId.equals(seller.organizationId);
      if (!sameBusiness || !TEAM_ROLES.includes(member!.role)) return NextResponse.json({ error: "You can't change this listing" }, { status: 403 });
    }

    const { status } = await req.json().catch(() => ({}));
    const allowed = availabilityOptions(listing.type);
    if (!allowed.includes(status)) {
      const names = allowed.map(s => AVAILABILITY_LABEL[s]);
      return NextResponse.json({ error: `This listing can be marked ${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}` }, { status: 400 });
    }
    const next = status as Availability;
    if (listing.status === next) return NextResponse.json({ ok: true, status: next });
    if (listing.status === "INACTIVE" && next !== "ACTIVE") {
      return NextResponse.json({ error: "Switch the listing back on before marking it sold or rented" }, { status: 400 });
    }

    if (next === "ACTIVE" && (await isUserBusinessSuspended(sellerId))) {
      return NextResponse.json({ error: "The business is suspended, so listings can't be switched back on." }, { status: 403 });
    }

    await Listing.updateOne({ _id: id }, { $set: { status: next, statusChangedAt: new Date() } });
    await logBusinessAction({ userId: session.user.id }, "listing.status", { type: "LISTING", id, label: listing.title }, { details: `${listing.status} → ${next}` });
    await invalidateListingAndSeller(id, sellerId);
    return NextResponse.json({ ok: true, status: next });
  } catch (error) {
    reportError("Listing availability error:", error);
    return NextResponse.json({ error: "Failed to update the listing" }, { status: 500 });
  }
}
