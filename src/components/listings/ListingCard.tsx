import Link from "next/link";
import Image from "next/image";
import { Fuel, Gauge, Cog, MapPin, Star, ImageOff } from "lucide-react";
import { IListing } from "@/models/Listing";

interface Props {
  listing: IListing & { _id: string };
}

const TYPE_BADGE: Record<IListing["type"], { label: string; className: string }> = {
  SALE: { label: "For Sale", className: "bg-white/90 text-slate-900" },
  RENT: { label: "For Rent", className: "bg-emerald-500/90 text-white" },
  BOTH: { label: "Sale & Rent", className: "bg-indigo-500/90 text-white" },
};

export default function ListingCard({ listing }: Props) {
  const badge = TYPE_BADGE[listing.type] ?? TYPE_BADGE.SALE;
  const photoCount = listing.images?.length ?? 0;

  const specs = [
    listing.mileage != null && { icon: Gauge, label: `${listing.mileage.toLocaleString()} km` },
    listing.fuelType && { icon: Fuel, label: listing.fuelType },
    listing.transmission && { icon: Cog, label: listing.transmission },
  ].filter(Boolean) as { icon: typeof Gauge; label: string }[];

  return (
    <Link
      href={`/listings/${listing._id}`}
      className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
    >
      <article
        className={`flex h-full flex-col overflow-hidden rounded-2xl bg-white border transition duration-300 ease-out
          group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_-16px_rgba(15,23,42,0.35)]
          ${listing.featured ? "border-amber-300/80 ring-1 ring-amber-200/60" : "border-slate-200/80"}`}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          {listing.images?.[0] ? (
            <Image
              src={listing.images[0]}
              alt={listing.title}
              fill
              sizes="(max-width: 500px) 50vw, (max-width: 1000px) 33vw, 300px"
              className="object-cover transition duration-500 ease-out group-hover:scale-[1.06]"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1.5 text-slate-400">
              <ImageOff size={22} strokeWidth={1.5} />
              <span className="text-xs">No image</span>
            </div>
          )}

          {/* Gradient for legibility of overlaid text */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />

          <span
            className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold tracking-wide backdrop-blur shadow-sm ${badge.className}`}
          >
            {badge.label}
          </span>

          {listing.featured && (
            <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 px-2 py-1 text-[10px] sm:text-[11px] font-bold text-amber-950 shadow-sm">
              <Star size={11} strokeWidth={2.5} fill="currentColor" />
              <span className="hidden min-[400px]:inline">Featured</span>
            </span>
          )}

          <div className="absolute inset-x-2.5 bottom-2 flex items-end justify-between text-white">
            <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-[11px] font-semibold backdrop-blur-sm">
              {listing.year}
            </span>
            {photoCount > 1 && (
              <span className="text-[11px] font-medium opacity-90">{photoCount} photos</span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate">
            {listing.make} · {listing.model}
          </p>
          <h3 className="mt-1 text-sm sm:text-[15px] font-semibold leading-snug text-slate-900 line-clamp-2 min-h-[2.5em]">
            {listing.title}
          </h3>

          <p className="mt-2 text-base sm:text-lg font-bold tracking-tight text-slate-900">
            <span className="mr-1 text-[11px] sm:text-xs font-semibold text-slate-400">PKR</span>
            {listing.price.toLocaleString()}
            {listing.type === "RENT" && <span className="ml-0.5 text-xs font-medium text-slate-400">/day</span>}
          </p>

          {specs.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] sm:text-xs text-slate-500">
              {specs.map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1 capitalize">
                  <Icon size={13} strokeWidth={1.75} className="text-slate-400" />
                  {label.toLowerCase()}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto pt-3">
            <div className="flex items-center gap-1 border-t border-slate-100 pt-2.5 text-[11px] sm:text-xs text-slate-500">
              <MapPin size={13} strokeWidth={1.75} className="flex-shrink-0 text-slate-400" />
              <span className="truncate">{listing.location}</span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
