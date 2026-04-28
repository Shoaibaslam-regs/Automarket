 "use client";

import { useState, useEffect } from "react";
import ListingCard from "@/components/listings/ListingCard";
import { IListing } from "@/models/Listing";

const MAKES = ["Toyota", "Honda", "Suzuki", "Yamaha", "Kawasaki", "BMW", "Mercedes", "Hyundai", "Kia", "Ford"];
const CONDITIONS = ["NEW", "EXCELLENT", "GOOD", "FAIR", "POOR"];

type ListingWithId = IListing & { _id: string };

export default function ListingsPage() {
  const [listings, setListings] = useState<ListingWithId[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [make, setMake] = useState("");
  const [condition, setCondition] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [location, setLocation] = useState("");
  const [sort, setSort] = useState("createdAt");

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", "12");
    if (search) params.set("search", search);
    if (type) params.set("type", type);
    if (make) params.set("make", make);
    if (condition) params.set("condition", condition);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (location) params.set("location", location);
    if (sort) params.set("sort", sort);

    setLoading(true);

    fetch(`/api/listings?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setListings(data.listings || []);
        setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
      })
      .catch((err) => console.error("Failed to fetch listings:", err))
      .finally(() => setLoading(false));
  }, [page, search, type, make, condition, minPrice, maxPrice, location, sort]);

  function clearFilters() {
    setSearch(""); setType(""); setMake(""); setCondition("");
    setMinPrice(""); setMaxPrice(""); setLocation(""); setSort("createdAt");
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by make, model, location..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-6">
          <aside className="w-56 flex-shrink-0 space-y-5">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Type</h3>
              <div className="space-y-1">
                {([["", "All types"], ["SALE", "For Sale"], ["RENT", "For Rent"], ["BOTH", "Sale & Rent"]] as [string, string][]).map(([val, label]) => (
                  <button key={val} onClick={() => { setType(val); setPage(1); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition ${
                      type === val ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Make</h3>
              <select value={make} onChange={(e) => { setMake(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All makes</option>
                {MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Condition</h3>
              <select value={condition} onChange={(e) => { setCondition(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Any condition</option>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Price (PKR)</h3>
              <input type="number" placeholder="Min" value={minPrice}
                onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="number" placeholder="Max" value={maxPrice}
                onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Location</h3>
              <input type="text" placeholder="City or area" value={location}
                onChange={(e) => { setLocation(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <button onClick={clearFilters}
              className="w-full py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition">
              Clear filters
            </button>
          </aside>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                {pagination.total} vehicle{pagination.total !== 1 ? "s" : ""} found
              </p>
              <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none">
                <option value="createdAt">Newest first</option>
                <option value="price">Price: low to high</option>
              </select>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 h-72 animate-pulse" />
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-lg">No listings found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.map((listing) => (
                  <ListingCard key={listing._id} listing={listing} />
                ))}
              </div>
            )}

            {pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100">
                  Previous
                </button>
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`px-4 py-2 text-sm rounded-lg ${
                      p === page ? "bg-blue-600 text-white" : "border border-gray-300 hover:bg-gray-100"
                    }`}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100">
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}