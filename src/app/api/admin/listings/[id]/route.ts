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
    const gate = await requireAdminApi("listings");
    if (!gate.ok) return gate.response;
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    // Only the status (the old `featured` switch is gone: businesses boost their own vehicles); never pass the
    // request body straight to the database
    const update: Record<string, unknown> = {};
    if (body.status !== undefined) {
      if (!LISTING_STATUSES.includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      update.status = body.status;
      update.statusChangedAt = new Date();
      // Taking a listing down sticks: the seller can't switch it back on until an admin does
      update.removedByAdmin = body.status === "INACTIVE" || body.status === "PENDING";
    }
    if (!Object.keys(update).length) return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
    await connectDB();
    const listing = await Listing.findByIdAndUpdate(id, { $set: update }, { returnDocument: "after" });
    if (listing) {
      await invalidateListingAndSeller(id, listing.sellerId);
      await logAdminAction(gate.admin, "listing.update", { type: "LISTING", id: listing._id, label: listing.title }, `status → ${update.status}`);
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
    const gate = await requireAdminApi("listings");
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
