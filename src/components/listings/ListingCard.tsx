import Link from "next/link";
import Image from "next/image";
import { Fuel, Gauge, Cog, MapPin, Star, ImageOff, Camera, ArrowUpRight } from "lucide-react";
import { IListing } from "@/models/Listing";

interface Props {
  listing: IListing & { _id: string };
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

export default function ListingCard({ listing }: Props) {
  const badge = TYPE_BADGE[listing.type] ?? TYPE_BADGE.SALE;
  const photoCount = listing.images?.length ?? 0;
  const seller = sellerOf(listing);

  const specs = [
    listing.mileage != null && { icon: Gauge, label: `${listing.mileage.toLocaleString()} km` },
    listing.fuelType && { icon: Fuel, label: listing.fuelType },
    listing.transmission && { icon: Cog, label: listing.transmission },
  ].filter(Boolean) as { icon: typeof Gauge; label: string }[];

  return (
    <Link
      href={`/listings/${listing._id}`}
      className="group block h-full rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
    >
      <article
        className={`flex h-full flex-col rounded-[22px] bg-white p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 transition duration-300 ease-out sm:p-2
          group-hover:shadow-[0_20px_44px_-20px_rgba(15,23,42,0.35)]
          ${listing.featured ? "ring-amber-300/80" : "ring-slate-200/80 group-hover:ring-slate-300"}`}
      >
        {/* Image tile */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
          {listing.images?.[0] ? (
            <Image
              src={listing.images[0]}
              alt={listing.title}
              fill
              sizes="(max-width: 440px) 100vw, (max-width: 1024px) 50vw, 340px"
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

          <span className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide shadow-sm backdrop-blur sm:text-[11px] ${badge.className}`}>
            {badge.label}
          </span>

          {listing.featured && (
            <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 px-2 py-1 text-[10px] font-bold text-amber-950 shadow-sm sm:text-[11px]">
              <Star size={11} strokeWidth={2.5} fill="currentColor" />
              <span className="hidden min-[400px]:inline">Featured</span>
            </span>
          )}

          <div className="absolute inset-x-2.5 bottom-2.5 flex items-center justify-between gap-2 text-white">
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
        <div className="flex flex-1 flex-col px-1.5 pb-1.5 pt-3 sm:px-2 sm:pb-2">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {listing.make} · {listing.model}
          </p>
          <h3 className="mt-1 line-clamp-2 min-h-[2.5em] text-sm font-semibold leading-snug text-slate-900 sm:text-[15px]">
            {listing.title}
          </h3>

          <p className="mt-2 text-lg font-bold tracking-tight text-slate-900">
            <span className="mr-1 text-[11px] font-semibold text-slate-400 sm:text-xs">PKR</span>
            {listing.price.toLocaleString()}
            {listing.type === "RENT" && <span className="ml-0.5 text-xs font-medium text-slate-400">/day</span>}
          </p>

          {specs.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {specs.map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1 rounded-full bg-slate-100/80 px-2 py-0.5 text-[11px] capitalize text-slate-600">
                  <Icon size={12} strokeWidth={1.75} className="text-slate-400" />
                  {label.toLowerCase()}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto pt-3">
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs text-slate-500">
              <span className="flex min-w-0 items-center gap-1">
                <MapPin size={13} strokeWidth={1.75} className="flex-shrink-0 text-slate-400" />
                <span className="truncate">{listing.location}</span>
              </span>
              {seller?.name && (
                <span className="flex min-w-0 max-w-[45%] items-center gap-1.5" title={seller.name}>
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
  );
}
