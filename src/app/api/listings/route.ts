import { NextRequest, NextResponse, after } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { cleanAddress } from "@/lib/address";
// Registers the model for the seller → business populate below
import "@/models/Organization";
import { auth } from "@/lib/auth";
import { buildListingQuery, parseFilters } from "@/lib/listingFilters";
import { notifySavedSearches } from "@/lib/savedSearchAlerts";
import { reserveListingSlot } from "@/lib/subscription";
import { parseListingFields, parseRentalFields } from "@/lib/listingInput";
import { isUserBusinessSuspended } from "@/lib/business";
import { PUBLIC_CACHE_SECONDS, invalidateListingAndSeller } from "@/lib/pageCache";
import { logBusinessAction } from "@/lib/businessLog";
import { CARD_SELLER_POPULATE } from "@/lib/cardSeller";
import { reportError } from "@/lib/errorLog";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    // Capped: a huge page number would only make the database skip through everything
    const page = Math.min(500, Math.max(1, parseInt(searchParams.get("page") || "1") || 1));
    const limit = Math.min(48, Math.max(1, parseInt(searchParams.get("limit") || "12") || 12));
    const sort = searchParams.get("sort") || "createdAt";

    const SORTS: Record<string, Record<string, 1 | -1>> = {
      createdAt: { createdAt: -1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      price: { price: -1 },
      year_desc: { year: -1 },
      mileage_asc: { mileage: 1 },
    };
    const sortOrder = SORTS[sort] ?? SORTS.createdAt;

    // Recently sold or rented vehicles stay visible with a tag unless the visitor asks for available ones only
    const availableOnly = searchParams.get("available") === "1";
    const query = buildListingQuery(parseFilters(searchParams), { includeClosed: !availableOnly });
    // Listings without a mileage would otherwise sort first as "lowest"
    if (sort === "mileage_asc" && !query.mileage) query.mileage = { $ne: null };

    const skip = (page - 1) * limit;
    const total = await Listing.countDocuments(query);

    const listings = await Listing.find(query)
      // Public feed: only what a card shows. Contact details stay on the listing page.
      // The seller's business (if any) lets cards show "listed by a business" vs a private seller
      .populate(CARD_SELLER_POPULATE)
      // "ACTIVE" sorts before "RENTED" and "SOLD", so available vehicles always come first
      .sort({ status: 1, featured: -1, ...sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json(
      {
        listings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      // The public feed is the same for everyone, so the CDN may serve it for PUBLIC_CACHE_SECONDS per
      // filter URL (and a stale copy for as long again while it refreshes). Browsers always ask the CDN.
      { headers: { "Cache-Control": `public, max-age=0, s-maxage=${PUBLIC_CACHE_SECONDS}, stale-while-revalidate=${PUBLIC_CACHE_SECONDS}` } }
    );
  } catch (error) {
    reportError("Get listings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    // Every field is checked for type, length and range (src/lib/listingInput.ts)
    const fields = parseListingFields(body);
    if (!fields.ok) return NextResponse.json({ error: fields.error }, { status: 400 });
    const f = fields.value;
    const rental = f.type === "RENT" || f.type === "BOTH" ? parseRentalFields(body) : null;
    if (rental && !rental.ok) return NextResponse.json({ error: rental.error }, { status: 400 });

    if (await isUserBusinessSuspended(session.user.id)) {
      return NextResponse.json({ error: "Your business is suspended, so new listings can't be posted. Contact support from your business console." }, { status: 403 });
    }

    // Every image must have passed the AI vehicle check at upload time (see lib/uploadthing.ts)
    const imageUrls = f.images ?? [];
    if (imageUrls.length > 0) {
      const { VehicleImage } = await import("@/models/VehicleImage");
      const verified = await VehicleImage.countDocuments({ url: { $in: imageUrls }, userId: session.user.id });
      if (verified !== imageUrls.length) {
        return NextResponse.json(
          { error: "Some images were not verified as vehicle photos. Please re-upload them." },
          { status: 400 }
        );
      }
    }

    // The plan's monthly quota: the slot is taken before saving (reserveListingSlot), so sending many requests
    // at once can't post past the limit. It counts for good, even if the listing is deleted later.
    const listingId = new mongoose.Types.ObjectId();
    const slot = await reserveListingSlot(session.user.id, { listingId });
    if (!slot.ok) return NextResponse.json(slot.error, { status: 403 });

    let listing;
    try {
      listing = await Listing.create({
        _id: listingId,
        title: f.title, description: f.description, price: f.price, type: f.type, condition: f.condition,
        make: f.make, model: f.model, year: f.year, mileage: f.mileage, color: f.color, fuelType: f.fuelType,
        transmission: f.transmission, location: f.location,
        address: cleanAddress(body.address) || undefined,
        images: imageUrls,
        sellerId: session.user.id,
        status: "ACTIVE",
      });
    } catch (e) {
      await slot.release();
      throw e;
    }

    if (rental?.ok) {
      const { Rental } = await import("@/models/Rental");
      await Rental.create({ listingId: listing._id, ...rental.value, ownerId: session.user.id });
    }

    // Email users whose saved searches match, without delaying the seller's response
    after(() => notifySavedSearches(listing.toObject()).catch(err => reportError("Saved search alerts failed:", err)));

    // A business member's new listing should appear on the business page straight away
    await invalidateListingAndSeller(listing._id, session.user.id);
    await logBusinessAction({ userId: session.user.id }, "listing.create", { type: "LISTING", id: listing._id, label: listing.title }, { amount: listing.price });
    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    reportError("Create listing error:", error);
    return NextResponse.json(
      { error: "Failed to create listing" },
      { status: 500 }
    );
  }
}
