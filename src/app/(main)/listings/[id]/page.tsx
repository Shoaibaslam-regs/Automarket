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
import { unstable_cache } from "next/cache";
import { PUBLIC_CACHE_SECONDS, listingTag } from "@/lib/pageCache";
import type { Metadata } from "next";
import ImageGallery from "@/components/ui/ImageGallery";
import { SITE_URL } from "@/lib/site";
import { formatLakh } from "@/lib/format";
import { getBusinessRatings, getSellerBusinesses, type SellerBusiness } from "@/lib/reviews";
import VerifiedBadge from "@/components/VerifiedBadge";
import AvailabilityControl from "@/components/listings/AvailabilityControl";
import { closedTag } from "@/lib/availability";
import { mapsUrl } from "@/lib/address";
import { BadgeCheck, Building2, ChevronRight, MapPin, UserRound } from "lucide-react";
import FavoriteButton from "@/components/listings/FavoriteButton";
import CompareButton from "@/components/listings/CompareButton";
import EmiCalculator from "@/components/listings/EmiCalculator";
import BuyRequestButton from "@/components/purchases/BuyRequestButton";
import { getMembership } from "@/lib/business";
import StarRating from "@/components/reviews/StarRating";
import ReportButton from "@/components/reports/ReportButton";
import ListingCard from "@/components/listings/ListingCard";
import RecentlyViewed, { TrackListingView } from "@/components/listings/RecentlyViewed";
import type { IListing } from "@/models/Listing";
// Registers the model for the seller → business populate in loadSimilar
import "@/models/Organization";
import { CARD_SELLER_POPULATE } from "@/lib/cardSeller";

type Props = { params: Promise<{ id: string }> };

/**
 * Everything on the page that is the same for every visitor, cached for PUBLIC_CACHE_SECONDS and cleared
 * when the listing is edited. Cached values come back as plain JSON: ids and dates are strings.
 */
const loadListingPage = (id: string) =>
  unstable_cache(
    async () => {
      await connectDB();
      const listing = await Listing.findById(id).populate("sellerId", "name image phone createdAt phoneVerifiedAt").lean<{
        price: number; type: string; sellerId?: { _id?: mongoose.Types.ObjectId } | null;
      }>();
      if (!listing) return null;
      const [rental, inspection] = await Promise.all([
        Rental.findOne({ listingId: id }).lean(),
        Inspection.findOne({ listingId: id }).lean(),
      ]);
      // Who listed it: a business (with its rating) or a private seller
      const sellerId = listing.sellerId?._id?.toString();
      const business = sellerId ? (await getSellerBusinesses([sellerId])).get(sellerId) ?? null : null;
      const ratings = business ? await getBusinessRatings([business.id]) : new Map();
      const rating = (business && ratings.get(business.id)) || { average: 0, count: 0 };
      return JSON.parse(JSON.stringify({ listing, rental, inspection, business, rating }));
    },
    ["listing-page", id],
    { revalidate: PUBLIC_CACHE_SECONDS, tags: [listingTag(id)] }
  )();

/**
 * Up to 4 other live vehicles a visitor may also like: the same make and type first, then the same type at a
 * similar price. Cached like the rest of the page (plain JSON).
 */
const loadSimilar = (id: string, make: string, type: string, price: number) =>
  unstable_cache(
    async () => {
      await connectDB();
      const types = type === "BOTH" ? ["SALE", "RENT", "BOTH"] : [type, "BOTH"];
      const base = { _id: { $ne: new mongoose.Types.ObjectId(id) }, status: "ACTIVE", type: { $in: types } };
      const seller = CARD_SELLER_POPULATE;
      const sameMake = await Listing.find({ ...base, make: new RegExp(`^${make.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })
        .sort({ createdAt: -1 }).limit(4).populate(seller).lean();
      const more = sameMake.length < 4
        ? await Listing.find({ ...base, _id: { $nin: [new mongoose.Types.ObjectId(id), ...sameMake.map(x => x._id)] }, price: { $gte: price * 0.6, $lte: price * 1.4 } })
          .sort({ createdAt: -1 }).limit(4 - sameMake.length).populate(seller).lean()
        : [];
      return JSON.parse(JSON.stringify([...sameMake, ...more]));
    },
    ["listing-similar", id],
    { revalidate: PUBLIC_CACHE_SECONDS, tags: [listingTag(id)] }
  )();

// Shared by generateMetadata and the page, so the data is only read once per request
const getListingPage = cache(async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return loadListingPage(id) as Promise<{
    listing: unknown;
    rental: unknown;
    inspection: unknown;
    business: SellerBusiness | null;
    rating: { average: number; count: number };
  } | null>;
});
const getListing = async (id: string) => (await getListingPage(id))?.listing ?? null;

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
    address?: string;
    condition: string;
    images: string[];
    type: string;
    status: string;
    sellerId: {
      _id?: mongoose.Types.ObjectId;
      name?: string;
      phone?: string;
      phoneVerifiedAt?: string;
      createdAt?: Date;
    } | null;
  };

  const page = (await getListingPage(id))!;
  const similar = (await loadSimilar(id, l.make, l.type, l.price)) as Array<IListing & { _id: string }>;
  const rental = page.rental as {
    _id: mongoose.Types.ObjectId;
    dailyRate: number;
    weeklyRate?: number;
    monthlyRate?: number;
    deposit: number;
  } | null;

  const inspection = page.inspection as {
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
  const { business, rating } = page;
  // Sold or rented: shown with a tag so visitors move on to vehicles they can still buy or rent
  const closed = closedTag(l.status);
  // Business vehicles for sale can be bought online, except by the business's own team
  const viewerOrg = viewerId && business ? (await getMembership(viewerId))?.organizationId.toString() : undefined;
  const canBuy = !!business && isForSale && !closed && !isOwner && viewerOrg !== business.id;

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
              {closed && (
                <div className={`mt-4 flex flex-col gap-3 rounded-xl px-4 py-3 ring-1 ring-inset sm:flex-row sm:items-center sm:justify-between ${closed.tone === "sold" ? "bg-rose-50 ring-rose-200" : "bg-sky-50 ring-sky-200"}`}>
                  <div>
                    <p className={`text-sm font-bold ${closed.tone === "sold" ? "text-rose-700" : "text-sky-700"}`}>
                      {closed.tone === "sold" ? "This vehicle has been sold" : "This vehicle is rented out right now"}
                    </p>
                    <p className={`text-xs ${closed.tone === "sold" ? "text-rose-600/80" : "text-sky-700/80"}`}>
                      {closed.tone === "sold" ? "It's no longer available. Have a look at similar vehicles." : "It isn't available to book at the moment. Message the owner or check similar vehicles."}
                    </p>
                  </div>
                  <Link
                    href={`/listings?make=${encodeURIComponent(l.make.trim())}${closed.tone === "rented" ? "&type=RENT" : ""}&available=1`}
                    className="inline-flex flex-shrink-0 items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    See similar {l.make.trim()} vehicles <ChevronRight size={13} />
                  </Link>
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
                {l.sellerId && (business?.verified ? (
                  <VerifiedBadge />
                ) : business ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 ring-1 ring-inset ring-indigo-200">
                    <Building2 size={12} /> Business account
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
                      <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-base font-bold text-white">
                        {business.logo ? <Image src={business.logo} alt="" fill sizes="44px" className="object-cover" /> : business.name[0]?.toUpperCase()}
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
                  {l.sellerId.phoneVerifiedAt && (
                    <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200" title="This seller confirmed their mobile number by SMS">
                      <BadgeCheck size={12} /> Phone verified
                    </p>
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
                  <div className="mt-3 text-center">
                    <ReportButton targetType="LISTING" targetId={String(l._id)} label={l.title} hidden={isOwner || (!!business && viewerOrg === business.id)} />
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400">Seller info unavailable</p>
              )}
            </div>

            {canBuy && business && (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-gray-700">Buy from {business.name}</h2>
                <p className="mb-3 mt-1 text-xs text-gray-500">Send a purchase request. The business agrees the price with you, and you get a sale slip when it&apos;s done.</p>
                <BuyRequestButton listingId={String(l._id)} title={l.title} price={l.price} businessName={business.name} />
              </div>
            )}

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

                {closed ? (
                  <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5 text-center text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
                    {closed.tone === "sold" ? "Sold, so it can't be booked" : "Rented out right now, so it can't be booked"}
                  </p>
                ) : !isOwner && session?.user && (
                  <Link
                    href={`/rentals/${l._id}/book`}
                    className="mt-4 w-full block text-center py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
                  >
                    Book now
                  </Link>
                )}
                {!closed && !isOwner && !session?.user && (
                  <Link
                    href="/login"
                    style={{ display: "block", marginTop: "12px", padding: "10px", background: "var(--gh-f6f8fa)", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", textAlign: "center", fontSize: "13px", color: "var(--gh-57606a)", textDecoration: "none" }}
                  >
                    Login first for online booking
                  </Link>
                )}
              </div>
            )}

            {isForSale && !closed && <EmiCalculator price={l.price} />}

            {/* Owner actions */}
            {l.address && (
              <a href={mapsUrl(l.address, l.location)} target="_blank" rel="noreferrer" className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-5 transition hover:border-gray-300">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><MapPin size={17} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-gray-400">Where to see the vehicle</span>
                  <span className="mt-0.5 block text-sm font-semibold text-gray-900">{l.address}</span>
                  <span className="block text-xs text-gray-500">{l.location}</span>
                  <span className="mt-1.5 inline-block text-xs font-semibold text-indigo-600 group-hover:underline">Open in Google Maps</span>
                </span>
              </a>
            )}

            {isOwner && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Manage listing</h2>
                <div className="mb-3">
                  <p className="mb-1.5 text-xs text-gray-500">Mark it sold or rented when it&apos;s taken, so buyers see it straight away.</p>
                  <AvailabilityControl id={id} type={l.type} status={l.status} size="md" />
                </div>
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

        {/* More to look at */}
        {similar.length > 0 && (
          <section className="mt-10" aria-label="Similar vehicles">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">Similar vehicles</h2>
              <Link href={`/listings?make=${encodeURIComponent(l.make.trim())}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">See all {l.make.trim()}</Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {similar.map(s => <ListingCard key={s._id} listing={s} />)}
            </div>
          </section>
        )}
        <RecentlyViewed excludeId={id} className="mt-10" />
        <TrackListingView listing={{ id, title: l.title, price: l.price, type: l.type, image: l.images?.[0], location: l.location, year: l.year }} />
      </div>
    </div>
  );
}
