import Image from "next/image";
import { requireAuth } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import Link from "next/link";
import DeleteListing from "@/components/listings/DeleteListing";
import UserIdBadge from "@/components/UserIdBadge";

export default async function DashboardPage() {
  const session = await requireAuth();
  await connectDB();

  const listings = await Listing.find({ sellerId: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  const stats = [
    { label: "Total listings", value: listings.length },
    { label: "Active", value: listings.filter((l) => l.status === "ACTIVE").length },
    { label: "Sold / Rented", value: listings.filter((l) => ["SOLD", "RENTED"].includes(l.status)).length },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
              Welcome, {session.user.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-gray-500 text-sm">Manage your listings and bookings</p>
              <UserIdBadge id={session.user.id} />
            </div>
          </div>
          <Link href="/sell"
            className="w-full sm:w-auto text-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
            + Post listing
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5 min-w-0">
              <p className="text-[11px] sm:text-xs text-gray-400 truncate">{stat.label}</p>
              <p className="text-2xl sm:text-3xl font-semibold text-gray-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Your listings</h2>
          </div>

          {listings.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p>No listings yet</p>
              <Link href="/sell" className="text-blue-600 text-sm mt-2 inline-block hover:underline">
                Post your first listing
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {listings.map((listing) => (
                <div key={listing._id.toString()}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-3 px-4 sm:px-6 py-4">
                  <div className="relative w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {listing.images?.[0] ? (
                      <Image src={listing.images[0]} alt="" fill sizes="80px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">No img</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{listing.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {listing.make} {listing.model} · {listing.year} · {listing.location}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 mt-1 sm:hidden">
                      PKR {listing.price.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto flex-shrink-0 pl-[76px] sm:pl-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      listing.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                      listing.status === "SOLD" ? "bg-gray-100 text-gray-600" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {listing.status}
                    </span>
                    <p className="hidden sm:block text-sm font-medium text-gray-900 whitespace-nowrap">
                      PKR {listing.price.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2 ml-auto sm:ml-0">
                      <Link href={`/listings/${listing._id}`}
                        className="text-xs text-blue-600 hover:underline">
                        View
                      </Link>
                      <DeleteListing id={listing._id.toString()} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
