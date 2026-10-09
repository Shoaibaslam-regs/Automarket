import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";
import { checkPlanLimit } from "@/lib/subscription";
import { SLOT_STATUSES } from "@/lib/plans";

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

// Fields an owner may change on their own listing. Ownership (sellerId), promotion (featured)
// and timestamps are never writable here; admins use /api/admin/listings/[id] for those.
const EDITABLE_FIELDS = [
  "title", "description", "price", "type", "condition", "make", "model", "year",
  "mileage", "color", "fuelType", "transmission", "location", "images", "status",
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

    const listing = await Listing.findById(id).select("sellerId status").lean<{ sellerId: mongoose.Types.ObjectId; status: string }>();
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    if (String(listing.sellerId) !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const update: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (body && key in body) update[key] = body[key];
    }

    // Re-activating a sold or inactive listing takes a plan slot again
    const takesSlot = (status: unknown) => (SLOT_STATUSES as readonly unknown[]).includes(status);
    if ("status" in update && takesSlot(update.status) && !takesSlot(listing.status)) {
      const overLimit = await checkPlanLimit(session.user.id, "listings");
      if (overLimit) return NextResponse.json(overLimit, { status: 403 });
    }

    // Ownership is re-checked in the write itself so the update can never touch someone else's listing
    const updated = await Listing.findOneAndUpdate(
      { _id: id, sellerId: session.user.id },
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
    return NextResponse.json({ message: "Listing deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete listing" }, { status: 500 });
  }
}
