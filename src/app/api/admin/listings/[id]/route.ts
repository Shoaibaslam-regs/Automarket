import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { requireAdminApi } from "@/lib/adminAuth";
import { invalidateListingAndSeller } from "@/lib/pageCache";
import { logAdminAction } from "@/lib/adminLog";

const LISTING_STATUSES = ["ACTIVE", "SOLD", "RENTED", "PENDING", "INACTIVE"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAdminApi("write");
    if (!gate.ok) return gate.response;
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    // Only what the admin Listings page changes; never pass the request body straight to the database
    const update: Record<string, unknown> = {};
    if (body.status !== undefined) {
      if (!LISTING_STATUSES.includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      update.status = body.status;
      update.statusChangedAt = new Date();
    }
    if (body.featured !== undefined) {
      if (typeof body.featured !== "boolean") return NextResponse.json({ error: "Invalid value" }, { status: 400 });
      update.featured = body.featured;
    }
    if (!Object.keys(update).length) return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
    await connectDB();
    const listing = await Listing.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (listing) {
      await invalidateListingAndSeller(id, listing.sellerId);
      const what = [update.status && `status → ${update.status}`, update.featured !== undefined && (update.featured ? "featured" : "unfeatured")].filter(Boolean).join(", ");
      await logAdminAction(gate.admin, "listing.update", { type: "LISTING", id: listing._id, label: listing.title }, what);
    }
    return NextResponse.json({ listing });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAdminApi("write");
    if (!gate.ok) return gate.response;
    const { id } = await params;
    await connectDB();
    const deleted = await Listing.findByIdAndDelete(id);
    if (deleted) {
      await invalidateListingAndSeller(id, deleted.sellerId);
      await logAdminAction(gate.admin, "listing.delete", { type: "LISTING", id: deleted._id, label: deleted.title });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
