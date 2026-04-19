import { requireAuth } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import Link from "next/link";
import DeleteListing from "@/components/listings/DeleteListing";

export default async function DashboardPage() {
  const session = await requireAuth();
  await connectDB();

  const listings = await Listing.find({ sellerId: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Welcome, {session.user.name}
            </h1>
            <p className="text-gray-500 text-sm mt-1">Manage your listings and bookings</p>
          </div>
          <Link href="/sell"
            className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
            + Post listing
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total listings", value: listings.length },
            { label: "Active", value: listings.filter((l) => l.status === "ACTIVE").length },
            { label: "Sold / Rented", value: listings.filter((l) => ["SOLD", "RENTED"].includes(l.status)).length },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-400">{stat.label}</p>
              <p className="text-3xl font-semibold text-gray-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
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
                <div key={listing._id.toString()} className="flex items-center justify-between px-6 py-4">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-medium text-gray-900 truncate">{listing.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {listing.make} {listing.model} · {listing.year} · {listing.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      listing.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                      listing.status === "SOLD" ? "bg-gray-100 text-gray-600" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {listing.status}
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      PKR {listing.price.toLocaleString()}
                    </p>
                    <Link href={`/listings/${listing._id}`}
                      className="text-xs text-blue-600 hover:underline">
                      View
                    </Link>
                    <DeleteListing id={listing._id.toString()} />
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
