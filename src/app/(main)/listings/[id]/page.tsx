import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { Rental } from "@/models/Rental";
import { Inspection } from "@/models/Inspection";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";
import { cache } from "react";
import type { Metadata } from "next";
import ImageGallery from "@/components/ui/ImageGallery";
import { SITE_URL } from "@/lib/site";
import { formatLakh } from "@/lib/format";
import { Review } from "@/models/Review";
import { canReviewSeller, getSellerRatings } from "@/lib/reviews";
import FavoriteButton from "@/components/listings/FavoriteButton";
import CompareButton from "@/components/listings/CompareButton";
import EmiCalculator from "@/components/listings/EmiCalculator";
import SellerReviews from "@/components/reviews/SellerReviews";
import StarRating from "@/components/reviews/StarRating";
import { toReviewView } from "@/components/reviews/types";

type Props = { params: Promise<{ id: string }> };

// Shared by generateMetadata and the page, so the listing is only fetched once per request
const getListing = cache(async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await connectDB();
  return Listing.findById(id).populate("sellerId", "name image phone").lean();
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = (await getListing(id)) as {
    title: string; description: string; price: number; make: string; model: string;
    year: number; location: string; type: string; images?: string[];
  } | null;
  if (!listing) return { title: "Listing not found" };

  const price = `PKR ${listing.price.toLocaleString()}${listing.type === "RENT" ? "/day" : ""}`;
  const title = `${listing.year} ${listing.make.trim()} ${listing.model.trim()} — ${price} in ${listing.location.trim()}`;
  const description = listing.description.replace(/\s+/g, " ").trim().slice(0, 160);
  const images = listing.images?.length ? [{ url: listing.images[0], alt: listing.title }] : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/listings/${id}` },
    openGraph: { title, description, url: `/listings/${id}`, images },
    twitter: { card: "summary_large_image", title, description, images: images?.map(i => i.url) },
  };
}

export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;

  const listing = await getListing(id);
  if (!listing) notFound();

  const l = listing as mongoose.Document & {
    _id: mongoose.Types.ObjectId;
    title: string;
    description: string;
    price: number;
    make: string;
    model: string;
    year: number;
    mileage?: number;
    fuelType?: string;
    transmission?: string;
    color?: string;
    location: string;
    condition: string;
    images: string[];
    type: string;
    status: string;
    sellerId: {
      _id?: mongoose.Types.ObjectId;
      name?: string;
      phone?: string;
    } | null;
  };

  const rental = await Rental.findOne({ listingId: id }).lean() as {
    _id: mongoose.Types.ObjectId;
    dailyRate: number;
    weeklyRate?: number;
    monthlyRate?: number;
    deposit: number;
  } | null;

  const inspection = await Inspection.findOne({ listingId: id }).lean() as {
    make?: string;
    model?: string;
    year?: number;
    condition?: string;
    damageScore?: number;
    estimate?: number;
  } | null;

  const session = await auth();
  const sellerId = l.sellerId?._id?.toString();
  const viewerId = session?.user?.id;
  const isOwner = !!viewerId && viewerId === sellerId;

  // Seller reputation: rating summary, first page of reviews, and whether this viewer may review
  const REVIEW_PAGE = 10;
  const [ratings, sellerReviews, myReview, eligible] = sellerId
    ? await Promise.all([
        getSellerRatings([sellerId]),
        Review.find({ sellerId }).sort({ createdAt: -1 }).limit(REVIEW_PAGE).populate("reviewerId", "name image").lean(),
        viewerId ? Review.findOne({ sellerId, reviewerId: viewerId }).populate("reviewerId", "name image").lean() : null,
        viewerId && !isOwner ? canReviewSeller(viewerId, sellerId) : false,
      ])
    : [new Map(), [], null, false];
  const rating = (sellerId && ratings.get(sellerId)) || { average: 0, count: 0 };
  const viewer = !viewerId ? "anon" : isOwner ? "owner" : eligible || myReview ? "eligible" : "ineligible";
  const isForSale = l.type === "SALE" || l.type === "BOTH";

  const specs = [
    { label: "Condition", value: l.condition },
    { label: "Mileage", value: l.mileage ? `${l.mileage.toLocaleString()} km` : "N/A" },
    { label: "Fuel type", value: l.fuelType ?? "N/A" },
    { label: "Transmission", value: l.transmission ?? "N/A" },
    { label: "Color", value: l.color ?? "N/A" },
    { label: "Location", value: l.location },
  ];

  const inspectionSpecs = inspection ? [
    { label: "Detected make", value: inspection.make },
    { label: "Detected model", value: inspection.model },
    { label: "Estimated year", value: inspection.year?.toString() },
    { label: "Condition", value: inspection.condition },
    { label: "Damage score", value: inspection.damageScore != null ? `${inspection.damageScore}/10` : null },
    { label: "Estimated value", value: inspection.estimate ? `PKR ${inspection.estimate.toLocaleString()}` : null },
  ].filter((s): s is { label: string; value: string } => s.value != null) : [];

  // Structured data so search engines can show price and availability in results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: l.title,
    description: l.description,
    brand: { "@type": "Brand", name: l.make },
    model: l.model,
    vehicleModelDate: String(l.year),
    image: l.images,
    ...(l.mileage != null && { mileageFromOdometer: { "@type": "QuantitativeValue", value: l.mileage, unitCode: "KMT" } }),
    ...(l.fuelType && { fuelType: l.fuelType }),
    ...(l.transmission && { vehicleTransmission: l.transmission }),
    ...(l.color && { color: l.color }),
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/listings/${id}`,
      price: l.price,
      priceCurrency: "PKR",
      availability: l.status === "ACTIVE" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      itemCondition: l.condition === "NEW" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        // Escape "<" so listing text can't close the script tag
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left */}
          <div className="lg:col-span-2 space-y-6">
          {/* Images */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <ImageGallery images={l.images ?? []} title={l.title} />
            </div>
            {/* Title + price */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">{l.title}</h1>
                  <p className="text-gray-500 mt-1">{l.make} {l.model} · {l.year}</p>
                </div>
                <div className="text-right">
                  {/* Rent-only listings store the daily rate as their price */}
                  <p className="text-2xl font-bold text-gray-900">
                    PKR {l.type === "RENT" ? l.price.toLocaleString("en-PK") : formatLakh(l.price)}
                    {l.type === "RENT" && <span className="text-sm font-medium text-gray-400">/day</span>}
                  </p>
                  {l.type !== "RENT" && l.price >= 1e5 && (
                    <p className="text-xs text-gray-400">PKR {l.price.toLocaleString("en-PK")}</p>
                  )}
                  {rental && l.type !== "RENT" && (
                    <p className="text-sm text-green-600 mt-1">PKR {rental.dailyRate.toLocaleString()}/day</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <FavoriteButton listingId={id} variant="pill" />
                <CompareButton variant="pill" item={{ id, title: l.title, image: l.images?.[0], price: l.price, type: l.type }} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
                {specs.map((spec) => (
                  <div key={spec.label}>
                    <p className="text-xs text-gray-400">{spec.label}</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{spec.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{l.description}</p>
            </div>

            {/* AI Inspection */}
            {inspection && inspectionSpecs.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">AI inspection report</h2>
                <div className="grid grid-cols-2 gap-4">
                  {inspectionSpecs.map((s) => (
                    <div key={s.label} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400">{s.label}</p>
                      <p className="text-sm font-medium text-gray-800 mt-0.5">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sellerId && (
              <SellerReviews
                sellerId={sellerId}
                listingId={id}
                sellerName={l.sellerId?.name?.split(" ")[0] ?? "this seller"}
                viewer={viewer}
                initialReviews={sellerReviews.map(toReviewView)}
                initialSummary={rating}
                initialHasMore={rating.count > REVIEW_PAGE}
                myReview={myReview ? toReviewView(myReview) : undefined}
              />
            )}
          </div>

          {/* Right */}
          <div className="space-y-4">

            {/* Seller */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Seller</h2>
              {l.sellerId ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                      {l.sellerId.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{l.sellerId.name ?? "Unknown"}</p>
                      {rating.count > 0 ? (
                        <a href="#reviews" className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800">
                          <StarRating value={rating.average} size={12} />
                          <span className="font-semibold text-gray-800">{rating.average.toFixed(1)}</span>
                          <span>({rating.count})</span>
                        </a>
                      ) : (
                        <p className="text-xs text-gray-400">No reviews yet</p>
                      )}
                    </div>
                  </div>
                  {l.sellerId.phone && (
                    <a href={`tel:${l.sellerId.phone}`}
                      className="mt-4 w-full block text-center py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                      Call seller
                    </a>
                  )}

                  <a href={`https://wa.me/${l.sellerId.phone?.replace(/\D/g, "")}?text=Hi, I'm interested in: ${l.title}`}
                    target="_blank" rel="noreferrer"
                    className="mt-2 w-full block text-center py-2.5 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition">
                    WhatsApp
                  </a>
                  {session?.user && !isOwner && (
  <Link
    href={`/messages?with=${l.sellerId?._id}&listing=${l._id}`}
    style={{ display: "block", marginTop: "8px", padding: "10px", background: "#f6f8fa", border: "1px solid #d0d7de", borderRadius: "8px", textAlign: "center", fontSize: "13px", color: "#0d1117", textDecoration: "none", fontWeight: 500 }}
  >
    Message seller
  </Link>
)}
                </>
              ) : (
                <p className="text-sm text-gray-400">Seller info unavailable</p>
              )}
            </div>

            {/* Rental */}
            {rental && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Rental rates</h2>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Daily</span>
                    <span className="font-medium">PKR {rental.dailyRate.toLocaleString()}</span>
                  </div>
                  {rental.weeklyRate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Weekly</span>
                      <span className="font-medium">PKR {rental.weeklyRate.toLocaleString()}</span>
                    </div>
                  )}
                  {rental.monthlyRate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Monthly</span>
                      <span className="font-medium">PKR {rental.monthlyRate.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                    <span className="text-gray-500">Security deposit</span>
                    <span className="font-medium">PKR {rental.deposit.toLocaleString()}</span>
                  </div>
                </div>

                {!isOwner && session?.user && (
                  <Link
                    href={`/rentals/${l._id}/book`}
                    className="mt-4 w-full block text-center py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
                  >
                    Book now
                  </Link>
                )}
                {!isOwner && !session?.user && (
                  <Link
                    href="/login"
                    style={{ display: "block", marginTop: "12px", padding: "10px", background: "#f6f8fa", border: "1px solid #d0d7de", borderRadius: "8px", textAlign: "center", fontSize: "13px", color: "#57606a", textDecoration: "none" }}
                  >
                    Login first for online booking
                  </Link>
                )}
              </div>
            )}

            {isForSale && <EmiCalculator price={l.price} />}

            {/* Owner actions */}
            {isOwner && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Manage listing</h2>
                <div className="space-y-2">
                  <Link href={`/sell/edit/${l._id}`}
                    className="w-full block text-center py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition">
                    Edit listing
                  </Link>
                  <Link href={`/listings/${l._id}/inspect`}
                    className="w-full block text-center py-2 border border-blue-300 text-blue-600 text-sm rounded-lg hover:bg-blue-50 transition">
                    Run AI inspection
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
