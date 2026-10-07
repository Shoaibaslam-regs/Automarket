import { NextRequest, NextResponse, after } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { auth } from "@/lib/auth";
import { buildListingQuery, parseFilters } from "@/lib/listingFilters";
import { notifySavedSearches } from "@/lib/savedSearchAlerts";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
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

    const query = buildListingQuery(parseFilters(searchParams));
    // Listings without a mileage would otherwise sort first as "lowest"
    if (sort === "mileage_asc" && !query.mileage) query.mileage = { $ne: null };

    const skip = (page - 1) * limit;
    const total = await Listing.countDocuments(query);

    const listings = await Listing.find(query)
      .populate("sellerId", "name email image phone")
      .sort({ featured: -1, ...sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      listings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get listings error:", error);
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
    const body = await req.json();

    const {
      title, description, price, type, condition,
      make, model, year, mileage, color, fuelType,
      transmission, location, images,
      dailyRate, weeklyRate, monthlyRate, deposit,
      availableFrom, availableTo,
    } = body;

    if (!title || !description || !price || !type || !condition || !make || !model || !year || !location) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Every image must have passed the AI vehicle check at upload time (see lib/uploadthing.ts)
    const imageUrls: string[] = Array.isArray(images) ? images.filter((u: unknown) => typeof u === "string") : [];
    if (imageUrls.length > 0) {
      const { VehicleImage } = await import("@/models/VehicleImage");
      const verified = await VehicleImage.countDocuments({ url: { $in: imageUrls }, userId: session.user.id });
      if (verified !== new Set(imageUrls).size) {
        return NextResponse.json(
          { error: "Some images were not verified as vehicle photos. Please re-upload them." },
          { status: 400 }
        );
      }
    }

    const listing = await Listing.create({
      title, description, price, type, condition,
      make, model, year, mileage, color, fuelType,
      transmission, location,
      images: imageUrls,
      sellerId: session.user.id,
      status: "ACTIVE",
    });

    if ((type === "RENT" || type === "BOTH") && dailyRate) {
      const { Rental } = await import("@/models/Rental");
      await Rental.create({
        listingId: listing._id,
        dailyRate,
        weeklyRate,
        monthlyRate,
        deposit: deposit || 0,
        availableFrom: availableFrom ? new Date(availableFrom) : new Date(),
        availableTo: availableTo ? new Date(availableTo) : undefined,
        ownerId: session.user.id,
      });
    }

    // Email users whose saved searches match, without delaying the seller's response
    after(() => notifySavedSearches(listing.toObject()).catch(err => console.error("Saved search alerts failed:", err)));

    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    console.error("Create listing error:", error);
    return NextResponse.json(
      { error: "Failed to create listing" },
      { status: 500 }
    );
  }
}
