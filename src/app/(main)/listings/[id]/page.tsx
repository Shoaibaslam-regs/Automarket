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
import { BadgeCheck, Building2, CalendarCheck, ChevronRight, Cog, Fuel, Gauge, MapPin, MessageCircle, MessageSquare, Palette, Phone, ShieldAlert, ShieldCheck, UserRound } from "lucide-react";
import ReadMore from "@/components/ui/ReadMore";
import { RingAvatar } from "@/components/UserMenuDropdown";
import { conditionLabel } from "@/lib/vehicleOptions";
import FavoriteButton from "@/components/listings/FavoriteButton";
import CompareButton from "@/components/listings/CompareButton";
import ShareButton from "@/components/ShareButton";
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
import { whatsappUrl } from "@/lib/phone";
import ContactBar from "@/components/listings/ContactBar";

type Props = { params: Promise<{ id: string }> };

/**
 * Everything on the page that is the same for every visitor, cached for PUBLIC_CACHE_SECONDS and cleared
 * when the listing is edited. Cached values come back as plain JSON: ids and dates are strings.
 */
// One dark main action per box and quiet outlined ones, so the column stays calm
const PRIMARY_BTN = "flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800";
const OUTLINE_BTN = "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-slate-800 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50";

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
  return {
    title,
    description,
    alternates: { canonical: `/listings/${id}` },
    // The preview image is opengraph-image.tsx next to this page (photo, title, price and city)
    openGraph: { title, description, url: `/listings/${id}` },
    twitter: { card: "summary_large_image", title, description },
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
      image?: string;
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

  const priceText = `PKR ${l.type === "RENT" ? l.price.toLocaleString("en-PK") : formatLakh(l.price)}`;
  const whatsapp = whatsappUrl(l.sellerId?.phone, `Hi, I'm interested in: ${l.title}`);
  // Phones: price and contact fixed to the bottom, for anyone who isn't the seller while it can still be bought or rented
  const showContactBar = !!l.sellerId && !isOwner && !closed;

  // Shown as icon + value; the label is the icon's tooltip and is read out by screen readers
  const specs = [
    { label: "Condition", icon: ShieldCheck, value: l.condition ? conditionLabel(l.condition) : "N/A" },
    { label: "Mileage", icon: Gauge, value: l.mileage ? `${l.mileage.toLocaleString()} km` : "N/A" },
    { label: "Fuel type", icon: Fuel, value: l.fuelType ?? "N/A" },
    { label: "Transmission", icon: Cog, value: l.transmission ?? "N/A" },
    { label: "Color", icon: Palette, value: l.color ?? "N/A" },
    { label: "Location", icon: MapPin, value: l.location },
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
    <div className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        // Escape "<" so listing text can't close the script tag
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className={`max-w-6xl mx-auto px-4 pt-8 ${showContactBar ? "pb-28 lg:pb-8" : "pb-8"}`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left */}
          <div className="lg:col-span-2 space-y-6">
          {/* Images */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
              <ImageGallery images={l.images ?? []} title={l.title} />
            </div>
            {/* Title + price */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900">{l.title}</h1>
                  <p className="text-slate-500 mt-1">{l.make} {l.model} · {l.year}</p>
                </div>
                <div className="text-right">
                  {/* Rent-only listings store the daily rate as their price */}
                  <p className="text-2xl font-bold text-slate-900">
                    PKR {l.type === "RENT" ? l.price.toLocaleString("en-PK") : formatLakh(l.price)}
                    {l.type === "RENT" && <span className="text-sm font-medium text-slate-400">/day</span>}
                  </p>
                  {l.type !== "RENT" && l.price >= 1e5 && (
                    <p className="text-xs text-slate-400">PKR {l.price.toLocaleString("en-PK")}</p>
                  )}
                  {rental && l.type !== "RENT" && (
                    <p className="mt-1 text-sm text-slate-500">or rent at <span className="font-semibold text-slate-800">PKR {rental.dailyRate.toLocaleString()}</span>/day</p>
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
              {/* Save · Compare · Share: icon buttons (labels in their tooltips); saving confirms with a toast */}
              <div className="-ml-2.5 mt-3 flex items-center gap-1">
                <FavoriteButton listingId={id} variant="pill" />
                <CompareButton variant="pill" item={{ id, title: l.title, image: l.images?.[0], price: l.price, type: l.type }} />
                <ShareButton path={`/listings/${id}`} title={`${l.year} ${l.make.trim()} ${l.model.trim()}`} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
                {specs.map(({ label, icon: Icon, value }) => (
                  <div key={label} title={label} className="flex min-w-0 items-center gap-2.5">
                    <Icon size={18} strokeWidth={1.75} aria-hidden className="flex-shrink-0 text-slate-400" />
                    <p className="min-w-0 truncate text-sm font-medium text-slate-800">
                      <span className="sr-only">{label}: </span>{value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-3">Description</h2>
              <ReadMore text={l.description} lines={5} className="text-sm leading-7 text-slate-600" />
            </div>

            {/* AI Inspection */}
            {inspection && inspectionSpecs.length > 0 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6">
                <h2 className="text-base font-semibold text-slate-900 mb-4">AI inspection report</h2>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {inspectionSpecs.map((s) => (
                    <div key={s.label}>
                      <p className="text-xs text-slate-400">{s.label}</p>
                      <p className="text-sm font-medium text-slate-800 mt-0.5">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right */}
          <div className="space-y-4">

            {/* Seller */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900">Listed by</h2>
                {l.sellerId && (business?.verified ? (
                  <VerifiedBadge />
                ) : business ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700">
                    <Building2 size={12} /> Business account
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                    <UserRound size={12} /> Private seller
                  </span>
                ))}
              </div>
              {l.sellerId ? (
                <>
                  {business ? (
                    <Link href={`/dealers/${business.slug}`} className="group -m-2 flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50">
                      <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-base font-bold text-white">
                        {business.logo ? <Image src={business.logo} alt="" fill sizes="44px" className="object-cover" /> : business.name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{business.name}</p>
                        {rating.count > 0 ? (
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <StarRating value={rating.average} size={12} />
                            <span className="font-semibold text-slate-800">{rating.average.toFixed(1)}</span>
                            <span>({rating.count} review{rating.count !== 1 ? "s" : ""})</span>
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400">No reviews yet</p>
                        )}
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                          <Building2 size={11} /> {business.type === "RENTAL" ? "Rental company" : business.type === "BOTH" ? "Dealer & rentals" : "Dealer"}
                          {business.city && <><MapPin size={11} className="ml-1" /> {business.city}</>}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 transition group-hover:text-slate-500" />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3">
                      <RingAvatar name={l.sellerId.name} image={l.sellerId.image} size={38} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{l.sellerId.name ?? "Unknown"}</p>
                        <p className="text-xs text-slate-400">
                          Individual seller{l.sellerId.createdAt ? ` · on AutoMarket since ${new Date(l.sellerId.createdAt).getFullYear()}` : ""}
                        </p>
                      </div>
                    </div>
                  )}
                  {l.sellerId.phoneVerifiedAt && (
                    <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700" title="This seller confirmed their mobile number by SMS">
                      <BadgeCheck size={12} /> Phone verified
                    </p>
                  )}
                  {business && (
                    <p className="mt-3 text-xs text-slate-500">
                      Listed by {l.sellerId.name?.split(" ")[0] ?? "a team member"} at {business.name}.{" "}
                      <Link href={`/dealers/${business.slug}#reviews`} className="font-semibold text-indigo-700 hover:underline">See reviews</Link>
                    </p>
                  )}
                  {/* One dark main action (Call), quiet outlined ones beside it */}
                  {!isOwner && (
                    <div className="mt-4 space-y-2">
                      {l.sellerId.phone && (
                        <a href={`tel:${l.sellerId.phone}`} className={PRIMARY_BTN}>
                          <Phone size={16} /> Call seller
                        </a>
                      )}
                      {(whatsapp || session?.user) && (
                        <div className={`grid gap-2 ${whatsapp && session?.user ? "grid-cols-2" : "grid-cols-1"}`}>
                          {whatsapp && (
                            <a href={whatsapp} target="_blank" rel="noreferrer" className={OUTLINE_BTN}>
                              <MessageCircle size={16} className="text-emerald-600" /> WhatsApp
                            </a>
                          )}
                          {session?.user && (
                            <Link href={`/messages?with=${l.sellerId?._id}&listing=${l._id}`} className={OUTLINE_BTN}>
                              <MessageSquare size={16} className="text-slate-500" /> Message
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {/* A short safety reminder next to the contact buttons */}
                  {!isOwner && (
                    <p className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-3.5 text-xs leading-relaxed text-slate-500">
                      <ShieldAlert size={14} className="mt-px flex-shrink-0 text-amber-500" />
                      <span>
                        Never pay in advance. See the vehicle and its documents first.{" "}
                        <Link href="/help#safety" className="font-semibold text-slate-700 hover:underline">Safety tips</Link>
                      </span>
                    </p>
                  )}
                  <div className="mt-3 text-center">
                    <ReportButton targetType="LISTING" targetId={String(l._id)} label={l.title} hidden={isOwner || (!!business && viewerOrg === business.id)} />
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-400">Seller info unavailable</p>
              )}
            </div>

            {canBuy && business && (
              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5">
                <h2 className="text-sm font-semibold text-slate-900">Buy from {business.name}</h2>
                <p className="mb-3 mt-1 text-xs text-slate-500">Send a purchase request. The business agrees the price with you, and you get a sale slip when it&apos;s done.</p>
                <BuyRequestButton listingId={String(l._id)} title={l.title} price={l.price} businessName={business.name} />
              </div>
            )}

            {/* Rental */}
            {rental && (
              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5">
                <h2 className="mb-4 text-sm font-semibold text-slate-900">Rental rates</h2>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Daily</span>
                    <span className="font-semibold text-slate-900">PKR {rental.dailyRate.toLocaleString()}</span>
                  </div>
                  {rental.weeklyRate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Weekly</span>
                      <span className="font-semibold text-slate-900">PKR {rental.weeklyRate.toLocaleString()}</span>
                    </div>
                  )}
                  {rental.monthlyRate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Monthly</span>
                      <span className="font-semibold text-slate-900">PKR {rental.monthlyRate.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
                    <span className="text-slate-500">Security deposit</span>
                    <span className="font-semibold text-slate-900">PKR {rental.deposit.toLocaleString()}</span>
                  </div>
                </div>

                {closed ? (
                  <p className="mt-4 text-center text-xs font-medium text-slate-500">
                    {closed.tone === "sold" ? "Sold, so it can't be booked" : "Rented out right now, so it can't be booked"}
                  </p>
                ) : !isOwner && session?.user && (
                  <Link href={`/rentals/${l._id}/book`} className={`mt-4 ${PRIMARY_BTN}`}>
                    <CalendarCheck size={16} /> Book now
                  </Link>
                )}
                {!closed && !isOwner && !session?.user && (
                  <Link href="/login" className={`mt-4 ${OUTLINE_BTN}`}>
                    Sign in to book online
                  </Link>
                )}
              </div>
            )}

            {isForSale && !closed && <EmiCalculator price={l.price} />}

            {/* Owner actions */}
            {l.address && (
              <a href={mapsUrl(l.address, l.location)} target="_blank" rel="noreferrer" className="group flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5 transition hover:border-slate-300">
                <span className="flex flex-shrink-0 items-center justify-center text-slate-400"><MapPin size={17} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Where to see the vehicle</span>
                  <span className="mt-0.5 block text-sm font-semibold text-slate-900">{l.address}</span>
                  <span className="block text-xs text-slate-500">{l.location}</span>
                  <span className="mt-1.5 inline-block text-xs font-semibold text-indigo-600 group-hover:underline">Open in Google Maps</span>
                </span>
              </a>
            )}

            {isOwner && (
              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5">
                <h2 className="mb-3 text-sm font-semibold text-slate-900">Manage listing</h2>
                <div className="mb-3">
                  <p className="mb-1.5 text-xs text-slate-500">Mark it sold or rented when it&apos;s taken, so buyers see it straight away.</p>
                  <AvailabilityControl id={id} type={l.type} status={l.status} size="md" />
                </div>
                <div className="space-y-2">
                  <Link href={`/sell/edit/${l._id}`} className={OUTLINE_BTN}>
                    Edit listing
                  </Link>
                  <Link href={`/listings/${l._id}/inspect`} className={OUTLINE_BTN}>
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
      {showContactBar && (
        <ContactBar
          price={priceText}
          perDay={l.type === "RENT"}
          phone={l.sellerId?.phone}
          whatsapp={whatsapp}
          messageHref={session?.user ? `/messages?with=${sellerId}&listing=${l._id}` : undefined}
          bookHref={rental ? (session?.user ? `/rentals/${l._id}/book` : "/login") : undefined}
        />
      )}
    </div>
  );
}
