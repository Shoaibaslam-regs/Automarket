import Link from "next/link";
import Image from "next/image";
import { IListing } from "@/models/Listing";

interface Props {
  listing: IListing & { _id: string };
}

export default function ListingCard({ listing }: Props) {
  const badge =
    listing.type === "SALE"
      ? { label: "For Sale", color: "bg-blue-100 text-blue-700" }
      : listing.type === "RENT"
      ? { label: "For Rent", color: "bg-green-100 text-green-700" }
      : { label: "Sale & Rent", color: "bg-purple-100 text-purple-700" };

  return (
    <Link href={`/listings/${listing._id}`}>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition group">
        <div className="relative h-48 bg-gray-100">
          {listing.images?.[0] ? (
            <Image
              src={listing.images[0]}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">No image</div>
          )}
          <span className={`absolute top-3 left-3 text-xs font-medium px-2 py-1 rounded-full ${badge.color}`}>
            {badge.label}
          </span>
          {listing.featured && (
            <span className="absolute top-3 right-3 text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700">
              Featured
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-medium text-gray-900 truncate">{listing.title}</h3>
          <p className="text-sm text-gray-500 mt-1">{listing.make} {listing.model} · {listing.year}</p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-lg font-semibold text-gray-900">PKR {listing.price.toLocaleString()}</span>
            <span className="text-xs text-gray-400">{listing.location}</span>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {listing.mileage && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {listing.mileage.toLocaleString()} km
              </span>
            )}
            {listing.fuelType && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{listing.fuelType}</span>
            )}
            {listing.transmission && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{listing.transmission}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
