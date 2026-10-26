import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";
import { isUserBusinessSuspended } from "@/lib/business";
import { invalidateListingAndSeller } from "@/lib/pageCache";
import { cleanAddress } from "@/lib/address";
import { logBusinessAction } from "@/lib/businessLog";
import { parseListingFields } from "@/lib/listingInput";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const listing = await Listing.findById(id)
      .populate("sellerId", "name image phone createdAt")
      .lean();

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const { Rental } = await import("@/models/Rental");
    const rental = await Rental.findOne({ listingId: id }).lean();

    const { Inspection } = await import("@/models/Inspection");
    const inspection = await Inspection.findOne({ listingId: id }).lean();

    return NextResponse.json({ listing, rental, inspection });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch listing" }, { status: 500 });
  }
}

// Statuses an owner may set: PENDING is the admin's "under review" and isn't the seller's to choose
const SELLER_STATUSES = ["ACTIVE", "SOLD", "RENTED", "INACTIVE"] as const;

// Fields an owner may change on their own listing. Ownership (sellerId), promotion (featured)
// and timestamps are never writable here; admins use /api/admin/listings/[id] for those.
const EDITABLE_FIELDS = [
  "title", "description", "price", "type", "condition", "make", "model", "year",
  "mileage", "color", "fuelType", "transmission", "location", "address", "images", "status",
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    await connectDB();

    const listing = await Listing.findById(id).select("sellerId status images removedByAdmin").lean<{ sellerId: mongoose.Types.ObjectId; status: string; images?: string[]; removedByAdmin?: boolean }>();
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    if (String(listing.sellerId) !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
    const update: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (key in body) update[key] = body[key];
    }

    // The same type, length and range checks as a new listing, on the fields being changed
    const fields = parseListingFields(update, { partial: true });
    if (!fields.ok) return NextResponse.json({ error: fields.error }, { status: 400 });
    Object.assign(update, fields.value);
    if ("status" in update && !SELLER_STATUSES.includes(update.status as never)) {
      return NextResponse.json({ error: "Choose Available, Sold, Rented or Paused" }, { status: 400 });
    }

    // New photos must have passed the AI vehicle check, as on a new listing; ones already on it can stay
    if (fields.value.images) {
      const current = new Set(listing.images ?? []);
      const added = fields.value.images.filter(u => !current.has(u));
      if (added.length) {
        const { VehicleImage } = await import("@/models/VehicleImage");
        const verified = await VehicleImage.countDocuments({ url: { $in: added }, userId: session.user.id });
        if (verified !== added.length) {
          return NextResponse.json({ error: "Some images were not verified as vehicle photos. Please re-upload them." }, { status: 400 });
        }
      }
    }

    // An admin took it down: only an admin can put it back
    if ("status" in update && update.status !== listing.status && listing.removedByAdmin) {
      return NextResponse.json({ error: "This listing was taken down by the AutoGO team. Contact support to have it reviewed." }, { status: 403 });
    }

    if ("status" in update && update.status === "ACTIVE" && (await isUserBusinessSuspended(session.user.id))) {
      return NextResponse.json({ error: "Your business is suspended, so listings can't be switched back on." }, { status: 403 });
    }

    if ("status" in update && update.status !== listing.status) update.statusChangedAt = new Date();
    if ("address" in update) update.address = cleanAddress(update.address);

    // Ownership is re-checked in the write itself so the update can never touch someone else's listing
    const updated = await Listing.findOneAndUpdate(
      { _id: id, sellerId: session.user.id },
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await invalidateListingAndSeller(id, session.user.id);
    if (updated) await logBusinessAction({ userId: session.user.id }, "listing.update", { type: "LISTING", id: updated._id, label: updated.title });
    return NextResponse.json({ listing: updated });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update listing" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    await connectDB();

    const listing = await Listing.findById(id).select("sellerId").lean<{ sellerId: mongoose.Types.ObjectId }>();
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    if (String(listing.sellerId) !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete is scoped to the owner in the query itself, not just by the check above
    const deleted = await Listing.findOneAndDelete({ _id: id, sellerId: session.user.id });
    if (!deleted) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await invalidateListingAndSeller(id, session.user.id);
    await logBusinessAction({ userId: session.user.id }, "listing.delete", { type: "LISTING", id: deleted._id, label: deleted.title });
    return NextResponse.json({ message: "Listing deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete listing" }, { status: 500 });
  }
}
