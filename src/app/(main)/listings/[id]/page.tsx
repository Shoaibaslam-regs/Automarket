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
import { getBestDealForListing, getBusinessRatings, getSellerBusinesses } from "@/lib/reviews";
import { dealLabel, dealPrice } from "@/lib/deals";
import { BadgeCheck, Building2, ChevronRight, MapPin, Tag, UserRound } from "lucide-react";
import FavoriteButton from "@/components/listings/FavoriteButton";
import CompareButton from "@/components/listings/CompareButton";
import EmiCalculator from "@/components/listings/EmiCalculator";
import StarRating from "@/components/reviews/StarRating";

type Props = { params: Promise<{ id: string }> };

// Shared by generateMetadata and the page, so the listing is only fetched once per request
const getListing = cache(async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await connectDB();
  return Listing.findById(id).populate("sellerId", "name image phone createdAt").lean();
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
      createdAt?: Date;
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

  const isForSale = l.type === "SALE" || l.type === "BOTH";

  // Who listed it: a business (with its rating and any live deal) or a private seller
  const business = sellerId ? (await getSellerBusinesses([sellerId])).get(sellerId) : undefined;
  const [businessRatings, deal] = business
    ? await Promise.all([
        getBusinessRatings([business.id]),
        isForSale ? getBestDealForListing(business.id, id, l.price) : null,
      ])
    : [new Map(), null];
  const rating = (business && businessRatings.get(business.id)) || { average: 0, count: 0 };

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
                  {deal && (
                    <p className="text-sm font-medium text-gray-400 line-through">PKR {formatLakh(l.price)}</p>
                  )}
                  <p className={`text-2xl font-bold ${deal ? "text-rose-600" : "text-gray-900"}`}>
                    PKR {l.type === "RENT" ? l.price.toLocaleString("en-PK") : formatLakh(deal ? dealPrice(l.price, deal) : l.price)}
                    {l.type === "RENT" && <span className="text-sm font-medium text-gray-400">/day</span>}
                  </p>
                  {l.type !== "RENT" && l.price >= 1e5 && (
                    <p className="text-xs text-gray-400">PKR {(deal ? dealPrice(l.price, deal) : l.price).toLocaleString("en-PK")}</p>
                  )}
                  {rental && l.type !== "RENT" && (
                    <p className="text-sm text-green-600 mt-1">PKR {rental.dailyRate.toLocaleString()}/day</p>
                  )}
                </div>
              </div>
              {deal && business && (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-gradient-to-r from-rose-50 to-amber-50 px-4 py-3 ring-1 ring-inset ring-rose-200">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-rose-600 text-white"><Tag size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-rose-700">{deal.title} · {dealLabel(deal)}</p>
                    <p className="text-xs text-rose-600/80">
                      {deal.description ? `${deal.description} · ` : ""}Offer by {business.name}, ends {new Date(deal.endsAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
              )}
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

          </div>

          {/* Right */}
          <div className="space-y-4">

            {/* Seller */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-gray-700">Listed by</h2>
                {l.sellerId && (business ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 ring-1 ring-inset ring-indigo-200">
                    <BadgeCheck size={12} /> Business account
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">
                    <UserRound size={12} /> Private seller
                  </span>
                ))}
              </div>
              {l.sellerId ? (
                <>
                  {business ? (
                    <Link href={`/dealers/${business.slug}`} className="group -m-2 flex items-center gap-3 rounded-xl p-2 transition hover:bg-gray-50">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-base font-bold text-white">
                        {business.name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{business.name}</p>
                        {rating.count > 0 ? (
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                            <StarRating value={rating.average} size={12} />
                            <span className="font-semibold text-gray-800">{rating.average.toFixed(1)}</span>
                            <span>({rating.count} review{rating.count !== 1 ? "s" : ""})</span>
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400">No reviews yet</p>
                        )}
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-500">
                          <Building2 size={11} /> {business.type === "RENTAL" ? "Rental company" : business.type === "BOTH" ? "Dealer & rentals" : "Dealer"}
                          {business.city && <><MapPin size={11} className="ml-1" /> {business.city}</>}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 transition group-hover:text-gray-500" />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                        {l.sellerId.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{l.sellerId.name ?? "Unknown"}</p>
                        <p className="text-xs text-gray-400">
                          Individual seller{l.sellerId.createdAt ? ` · on AutoMarket since ${new Date(l.sellerId.createdAt).getFullYear()}` : ""}
                        </p>
                      </div>
                    </div>
                  )}
                  {business && (
                    <p className="mt-3 text-xs text-gray-500">
                      Listed by {l.sellerId.name?.split(" ")[0] ?? "a team member"} at {business.name}.{" "}
                      <Link href={`/dealers/${business.slug}#reviews`} className="font-semibold text-indigo-700 hover:underline">See reviews</Link>
                    </p>
                  )}
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
    style={{ display: "block", marginTop: "8px", padding: "10px", background: "var(--gh-f6f8fa)", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", textAlign: "center", fontSize: "13px", color: "var(--gh-0d1117)", textDecoration: "none", fontWeight: 500 }}
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
                    style={{ display: "block", marginTop: "12px", padding: "10px", background: "var(--gh-f6f8fa)", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", textAlign: "center", fontSize: "13px", color: "var(--gh-57606a)", textDecoration: "none" }}
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
