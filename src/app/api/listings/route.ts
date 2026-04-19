import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { auth } from "@/lib/auth";

type ListingQuery = {
  status: string;
  type?: string;
  make?: RegExp;
  condition?: string;
  location?: RegExp;
  price?: { $gte?: number; $lte?: number };
  $or?: Array<{ [key: string]: RegExp }>;
};

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const type = searchParams.get("type");
    const make = searchParams.get("make");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const condition = searchParams.get("condition");
    const location = searchParams.get("location");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "createdAt";

    const query: ListingQuery = { status: "ACTIVE" };

    if (type) query.type = type;
    if (make) query.make = new RegExp(make, "i");
    if (condition) query.condition = condition;
    if (location) query.location = new RegExp(location, "i");
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search) {
      query.$or = [
        { title: new RegExp(search, "i") },
        { make: new RegExp(search, "i") },
        { model: new RegExp(search, "i") },
        { location: new RegExp(search, "i") },
      ];
    }

    const skip = (page - 1) * limit;
    const total = await Listing.countDocuments(query);

    const listings = await Listing.find(query)
      .populate("sellerId", "name email image phone")
      .sort({ featured: -1, [sort]: -1 })
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

    const listing = await Listing.create({
      title, description, price, type, condition,
      make, model, year, mileage, color, fuelType,
      transmission, location,
      images: images || [],
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

    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    console.error("Create listing error:", error);
    return NextResponse.json(
      { error: "Failed to create listing" },
      { status: 500 }
    );
  }
}
