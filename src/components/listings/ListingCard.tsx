import Link from "next/link";
import Image from "next/image";
import { Fuel, Gauge, Cog, MapPin, Star, ImageOff, Camera, ArrowUpRight } from "lucide-react";
import { IListing } from "@/models/Listing";
import { formatLakh } from "@/lib/format";
import FavoriteButton from "./FavoriteButton";
import CompareButton from "./CompareButton";

interface Props {
  listing: IListing & { _id: string };
  /** "list" renders a horizontal row with a large photo, for the browse page's list view */
  layout?: "grid" | "list";
  /** Load the photo immediately; set for cards in the first row, which are above the fold */
  eager?: boolean;
}

const TYPE_BADGE: Record<IListing["type"], { label: string; className: string }> = {
  SALE: { label: "For Sale", className: "bg-white/90 text-slate-900" },
  RENT: { label: "For Rent", className: "bg-emerald-500/90 text-white" },
  BOTH: { label: "Sale & Rent", className: "bg-indigo-500/90 text-white" },
};

// sellerId is populated ({ name, image }) on the browse feed and a bare ObjectId elsewhere
function sellerOf(listing: Props["listing"]): { name?: string; image?: string } | null {
  const s = listing.sellerId as unknown;
  return s && typeof s === "object" && "name" in s ? (s as { name?: string; image?: string }) : null;
}

function PriceText({ listing, className }: { listing: Props["listing"]; className: string }) {
  return (
    <p className={className} title={`PKR ${listing.price.toLocaleString("en-PK")}`}>
      <span className="mr-1 text-[10px] font-semibold text-slate-400 sm:text-xs">PKR</span>
      {listing.type === "RENT" ? listing.price.toLocaleString("en-PK") : formatLakh(listing.price)}
      {listing.type === "RENT" && <span className="ml-0.5 text-xs font-medium text-slate-400">/day</span>}
    </p>
  );
}

export default function ListingCard({ listing, layout = "grid", eager }: Props) {
  if (layout === "list") return <ListingRow listing={listing} eager={eager} />;

  const badge = TYPE_BADGE[listing.type] ?? TYPE_BADGE.SALE;
  const photoCount = listing.images?.length ?? 0;
  const seller = sellerOf(listing);

  const specs = [
    listing.mileage != null && { icon: Gauge, label: `${listing.mileage.toLocaleString()} km` },
    listing.fuelType && { icon: Fuel, label: listing.fuelType },
    listing.transmission && { icon: Cog, label: listing.transmission },
  ].filter(Boolean) as { icon: typeof Gauge; label: string }[];

  const id = String(listing._id);

  // Action buttons are siblings of the link, not children: a <button> inside an <a> is invalid HTML
  return (
    <div className="group relative h-full">
      <Link
        href={`/listings/${id}`}
        className="block h-full rounded-2xl sm:rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
      >
        <article
          className={`flex h-full flex-col rounded-2xl bg-white p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 transition duration-300 ease-out sm:rounded-[22px] sm:p-2
            group-hover:shadow-[0_20px_44px_-20px_rgba(15,23,42,0.35)]
            ${listing.featured ? "ring-amber-300/80" : "ring-slate-200/80 group-hover:ring-slate-300"}`}
        >
          {/* Image tile */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 sm:rounded-2xl">
            {listing.images?.[0] ? (
              <Image
                src={listing.images[0]}
                alt={listing.title}
                fill
                loading={eager ? "eager" : undefined}
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 340px"
                className="object-cover transition duration-500 ease-out group-hover:scale-[1.04]"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1.5 text-slate-400">
                <ImageOff size={22} strokeWidth={1.5} />
                <span className="text-xs">No image</span>
              </div>
            )}

            {/* Soft gradients so overlaid chips stay legible on any photo */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/25 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />

            <div className="absolute left-2 top-2 flex items-center gap-1 sm:left-2.5 sm:top-2.5">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide shadow-sm backdrop-blur sm:px-2.5 sm:py-1 sm:text-[11px] ${badge.className}`}>
                {badge.label}
              </span>
              {listing.featured && (
                <span title="Featured" className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 px-1.5 py-1 text-[10px] font-bold text-amber-950 shadow-sm sm:px-2 sm:text-[11px]">
                  <Star size={11} strokeWidth={2.5} fill="currentColor" />
                  <span className="hidden lg:inline">Featured</span>
                </span>
              )}
            </div>

            <div className="absolute inset-x-2 bottom-2 flex items-center sm:inset-x-2.5 sm:bottom-2.5 justify-between gap-2 text-white">
              <span className="rounded-md bg-black/30 px-1.5 py-0.5 text-[11px] font-semibold backdrop-blur-sm">{listing.year}</span>
              {photoCount > 1 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-black/30 px-1.5 py-0.5 text-[11px] font-medium backdrop-blur-sm">
                  <Camera size={11} strokeWidth={2} />
                  {photoCount}
                </span>
              )}
            </div>

            {/* Hover affordance (pointer devices only, so touch never sees a stuck overlay) */}
            <span className="pointer-events-none absolute right-2.5 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-900 opacity-0 shadow-md transition duration-300 group-hover:opacity-100 [@media(hover:hover)]:flex">
              <ArrowUpRight size={16} strokeWidth={2} />
            </span>
          </div>

          {/* Body */}
          <div className="flex flex-1 flex-col px-1 pb-1 pt-2.5 sm:px-2 sm:pb-2 sm:pt-3">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:text-[11px]">
              {listing.make} · {listing.model}
            </p>
            <h3 className="mt-1 line-clamp-2 min-h-[2.5em] text-[13px] font-semibold leading-snug text-slate-900 sm:text-[15px]">
              {listing.title}
            </h3>

            <PriceText listing={listing} className="mt-1.5 truncate text-[15px] font-bold tracking-tight text-slate-900 sm:mt-2 sm:text-lg" />

            {specs.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1 sm:mt-2.5 sm:gap-1.5">
                {specs.map(({ icon: Icon, label }, i) => (
                  // Half-width phone cards show the two most useful specs; the rest appear from 400px up
                  <span key={label} className={`${i > 1 ? "hidden min-[400px]:inline-flex" : "inline-flex"} max-w-full items-center gap-1 truncate rounded-full bg-slate-100/80 px-1.5 py-0.5 text-[10px] capitalize text-slate-600 sm:px-2 sm:text-[11px]`}>
                    <Icon size={12} strokeWidth={1.75} className="text-slate-400" />
                    {label.toLowerCase()}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-auto pt-2.5 sm:pt-3">
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500 sm:pt-2.5 sm:text-xs">
                <span className="flex min-w-0 items-center gap-1">
                  <MapPin size={12} strokeWidth={1.75} className="flex-shrink-0 text-slate-400" />
                  <span className="truncate">{listing.location}</span>
                </span>
                {seller?.name && (
                  <span className="hidden min-w-0 max-w-[45%] items-center gap-1.5 sm:flex" title={seller.name}>
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                      {seller.name[0]?.toUpperCase()}
                    </span>
                    <span className="truncate">{seller.name.split(" ")[0]}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </article>
      </Link>
      <div className="absolute right-3.5 top-3.5 z-10 flex flex-col gap-1.5 sm:right-[18px] sm:top-[18px]">
        <FavoriteButton listingId={id} />
        <CompareButton item={{ id, title: listing.title, image: listing.images?.[0], price: listing.price, type: listing.type }} />
      </div>
    </div>
  );
}

function ListingRow({ listing, eager }: Pick<Props, "listing" | "eager">) {
  const badge = TYPE_BADGE[listing.type] ?? TYPE_BADGE.SALE;
  const photoCount = listing.images?.length ?? 0;
  const seller = sellerOf(listing);
  const id = String(listing._id);
  const href = `/listings/${id}`;

  const specs = [
    String(listing.year),
    listing.mileage != null && `${listing.mileage.toLocaleString()} km`,
    listing.fuelType,
    listing.transmission,
  ].filter(Boolean) as string[];

  // Photo and body are two links to the same page so the action buttons can sit on the photo
  // without being nested inside an <a>; the photo link is hidden from keyboard and screen readers
  return (
    <article
      className={`group relative flex gap-3 rounded-2xl bg-white p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 transition duration-300 ease-out sm:gap-5 sm:rounded-[22px] sm:p-2
        hover:shadow-[0_20px_44px_-24px_rgba(15,23,42,0.35)]
        ${listing.featured ? "ring-amber-300/80" : "ring-slate-200/80 hover:ring-slate-300"}`}
    >
      <div className="relative w-[42%] max-w-[340px] flex-shrink-0 self-start sm:w-[260px] md:w-[300px] lg:w-[320px]">
        <Link href={href} tabIndex={-1} aria-hidden="true" className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 sm:rounded-2xl">
          {listing.images?.[0] ? (
            <Image
              src={listing.images[0]}
              alt=""
              fill
              loading={eager ? "eager" : undefined}
              sizes="(max-width: 640px) 42vw, 320px"
              className="object-cover transition duration-500 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1.5 text-slate-400">
              <ImageOff size={22} strokeWidth={1.5} />
              <span className="text-xs">No image</span>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/45 to-transparent" />

          <div className="absolute left-2 top-2 flex items-center gap-1 sm:left-2.5 sm:top-2.5">
            {listing.featured && (
              <span title="Featured" className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 px-1.5 py-1 text-[10px] font-bold text-amber-950 shadow-sm sm:px-2 sm:text-[11px]">
                <Star size={11} strokeWidth={2.5} fill="currentColor" />
                <span className="hidden sm:inline">Featured</span>
              </span>
            )}
          </div>

          <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 text-white sm:inset-x-2.5 sm:bottom-2.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide shadow-sm backdrop-blur sm:px-2.5 sm:py-1 sm:text-[11px] ${badge.className}`}>
              {badge.label}
            </span>
            {photoCount > 1 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-black/30 px-1.5 py-0.5 text-[11px] font-medium backdrop-blur-sm">
                <Camera size={11} strokeWidth={2} />
                {photoCount}
              </span>
            )}
          </div>
        </Link>
        <div className="absolute right-2 top-2 z-10 flex flex-col gap-1.5 sm:right-2.5 sm:top-2.5">
          <FavoriteButton listingId={id} />
          <CompareButton item={{ id, title: listing.title, image: listing.images?.[0], price: listing.price, type: listing.type }} />
        </div>
      </div>

      <Link
        href={href}
        className="flex min-w-0 flex-1 flex-col rounded-xl py-1 pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 sm:py-2 sm:pr-3"
      >
        <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-4">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:text-[11px]">
              {listing.make} · {listing.model}
            </p>
            <h3 className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900 group-hover:text-indigo-700 sm:mt-1 sm:text-lg">
              {listing.title}
            </h3>
          </div>
          <PriceText listing={listing} className="flex-shrink-0 truncate text-[15px] font-bold tracking-tight text-slate-900 sm:text-xl md:text-right md:text-2xl" />
        </div>

        <p className="mt-1 flex min-w-0 items-center gap-1 text-[11px] text-slate-500 sm:mt-2 sm:text-sm">
          <MapPin size={13} strokeWidth={1.75} className="flex-shrink-0 text-slate-400" />
          <span className="truncate">{listing.location}</span>
        </p>

        {/* Spec strip: year | mileage | fuel | transmission */}
        <p className="mt-1.5 line-clamp-2 text-[11px] text-slate-600 sm:mt-3 sm:line-clamp-1 sm:text-sm">
          {specs.map((spec, i) => (
            <span key={spec} className="whitespace-nowrap">
              {i > 0 && <span className="mx-1.5 text-slate-300 sm:mx-2">|</span>}
              {spec}
            </span>
          ))}
        </p>

        {listing.description && (
          <p className="mt-2 hidden text-sm leading-relaxed text-slate-500 md:line-clamp-2">{listing.description}</p>
        )}

        <div className="mt-auto hidden items-center justify-between gap-3 border-t border-slate-100 pt-2.5 text-xs text-slate-500 sm:flex">
          <span className="rounded-full bg-slate-100/80 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600">
            {listing.condition.toLowerCase()}
          </span>
          {seller?.name && (
            <span className="flex min-w-0 items-center gap-1.5" title={seller.name}>
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                {seller.name[0]?.toUpperCase()}
              </span>
              <span className="truncate">{seller.name}</span>
            </span>
          )}
        </div>
      </Link>
    </article>
  );
}
