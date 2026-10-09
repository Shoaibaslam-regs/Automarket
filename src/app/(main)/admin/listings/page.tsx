"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ExternalLink, ImageOff, Star, Trash2 } from "lucide-react";
import { PageHeader, Panel, SearchField, SelectField, StatusBadge, btn } from "@/components/admin/ui";
import Select from "@/components/ui/Select";
import { useAdminAccess } from "@/components/admin/AdminAccess";

type Listing = {
  _id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price: number;
  status: string;
  type: string;
  featured: boolean;
  images: string[];
  sellerId: { name: string; email: string };
  createdAt: string;
};

const STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "PENDING", "SOLD", "RENTED"] as const;

export default function AdminListingsPage() {
  const { canWrite } = useAdminAccess();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => { fetchListings(); }, []);

  async function fetchListings() {
    const res = await fetch("/api/admin/listings");
    const data = await res.json();
    setListings(data.listings || []);
    setLoading(false);
  }

  async function updateListing(id: string, data: Record<string, unknown>) {
    setUpdating(id);
    await fetch(`/api/admin/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setUpdating(null);
    fetchListings();
  }

  async function deleteListing(id: string) {
    if (!confirm("Delete this listing permanently?")) return;
    setUpdating(id);
    await fetch(`/api/admin/listings/${id}`, { method: "DELETE" });
    setUpdating(null);
    fetchListings();
  }

  const q = search.toLowerCase();
  const filtered = listings.filter(l => {
    const matchSearch = l.title.toLowerCase().includes(q) || l.make.toLowerCase().includes(q);
    const matchStatus = statusFilter ? l.status === statusFilter : true;
    return matchSearch && matchStatus;
  });
  const featuredCount = listings.filter(l => l.featured).length;

  return (
    <>
      <PageHeader
        title="Listings"
        description={loading ? "Loading…" : `${listings.length.toLocaleString()} total · ${featuredCount} featured`}
        actions={
          <>
            <SearchField value={search} onChange={setSearch} placeholder="Search title or make…" />
            <SelectField value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} allLabel="All statuses" ariaLabel="Filter by status" />
          </>
        }
      />

      <Panel bodyClassName="divide-y divide-slate-100">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="h-14 w-20 animate-pulse rounded-lg bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-slate-500">No listings found</p>
        ) : (
          filtered.map(listing => (
            <div
              key={listing._id}
              className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 transition hover:bg-slate-50/60 sm:px-5 md:flex-nowrap"
            >
              <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {listing.images?.[0] ? (
                  <Image src={listing.images[0]} alt="" fill sizes="80px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <ImageOff size={18} />
                  </div>
                )}
                {listing.featured && (
                  <span className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-amber-950">
                    <Star size={9} fill="currentColor" />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900">{listing.title}</p>
                  <StatusBadge status={listing.status} />
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {listing.make} {listing.model} · {listing.year} · <span className="font-semibold text-slate-700">PKR {listing.price.toLocaleString()}</span>
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-400">by {listing.sellerId?.name || "Unknown"}</p>
              </div>

              <div className="flex w-full flex-wrap items-center gap-1.5 md:w-auto md:flex-shrink-0 md:flex-nowrap">
                <Link href={`/listings/${listing._id}`} target="_blank" className={`${btn.base} ${btn.secondary}`}>
                  <ExternalLink size={13} /> View
                </Link>
                <Select
                  value={listing.status}
                  onChange={v => updateListing(listing._id, { status: v })}
                  disabled={!canWrite || updating === listing._id}
                  ariaLabel="Change status"
                  size="sm"
                  options={STATUS_OPTIONS.map(s => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))}
                  className="w-auto min-w-[104px] text-slate-700"
                />
                <button
                  onClick={() => updateListing(listing._id, { featured: !listing.featured })}
                  disabled={!canWrite || updating === listing._id}
                  className={`${btn.base} ${listing.featured ? btn.warn : btn.secondary}`}
                >
                  <Star size={13} fill={listing.featured ? "currentColor" : "none"} />
                  {listing.featured ? "Featured" : "Feature"}
                </button>
                <button
                  onClick={() => deleteListing(listing._id)}
                  disabled={!canWrite || updating === listing._id}
                  aria-label="Delete listing"
                  className={`${btn.base} ${btn.danger} ml-auto md:ml-0`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </Panel>

      {!loading && (
        <p className="mt-3 text-xs text-slate-400">
          Showing {filtered.length} of {listings.length} listing{listings.length !== 1 ? "s" : ""}
        </p>
      )}
    </>
  );
}
