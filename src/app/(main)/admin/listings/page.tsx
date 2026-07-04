"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

const STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "PENDING", "SOLD", "RENTED"];

export default function AdminListingsPage() {
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

  const filtered = listings.filter(l => {
    const matchSearch = l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.make.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter ? l.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
    ACTIVE:   { bg: "#dafbe1", color: "#1a7f37" },
    INACTIVE: { bg: "#f6f8fa", color: "#57606a" },
    PENDING:  { bg: "#fff8c5", color: "#7d4e00" },
    SOLD:     { bg: "#ddf4ff", color: "#0550ae" },
    RENTED:   { bg: "#ffdfb6", color: "#953800" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <a href="/admin" style={{ fontSize: "13px", color: "#57606a", textDecoration: "none" }}>← Admin</a>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0d1117", marginTop: "8px" }}>Listings</h1>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search listings..."
              style={{ padding: "8px 14px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", width: "200px" }} />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: "8px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none" }}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#57606a" }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#57606a" }}>No listings found</div>
          ) : filtered.map(listing => (
            <div key={listing._id} style={{ padding: "14px 20px", borderBottom: "1px solid #f6f8fa", display: "flex", alignItems: "center", gap: "14px" }}>
              {/* Image */}
              <div style={{ width: "64px", height: "48px", borderRadius: "6px", overflow: "hidden", background: "#f6f8fa", flexShrink: 0 }}>
                {listing.images?.[0] ? (
                  <img src={listing.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#8c959f" }}>No img</div>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{listing.title}</p>
                  {listing.featured && <span style={{ fontSize: "10px", background: "#fff8c5", color: "#7d4e00", padding: "1px 6px", borderRadius: "20px", fontWeight: 600, flexShrink: 0 }}>Featured</span>}
                </div>
                <p style={{ fontSize: "11px", color: "#57606a" }}>
                  {listing.make} {listing.model} · {listing.year} · PKR {listing.price.toLocaleString()} · by {listing.sellerId?.name}
                </p>
              </div>

              {/* Status */}
              <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", background: STATUS_COLORS[listing.status]?.bg || "#f6f8fa", color: STATUS_COLORS[listing.status]?.color || "#57606a", flexShrink: 0 }}>
                {listing.status}
              </span>

              {/* Actions */}
              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                <Link href={`/listings/${listing._id}`} target="_blank"
                  style={{ padding: "5px 10px", background: "#f6f8fa", border: "1px solid #d0d7de", borderRadius: "6px", fontSize: "11px", color: "#0d1117", textDecoration: "none" }}>
                  View
                </Link>
                <select
                  value={listing.status}
                  onChange={e => updateListing(listing._id, { status: e.target.value })}
                  disabled={updating === listing._id}
                  style={{ padding: "5px 8px", border: "1px solid #d0d7de", borderRadius: "6px", fontSize: "11px", color: "#0d1117", cursor: "pointer", outline: "none" }}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  onClick={() => updateListing(listing._id, { featured: !listing.featured })}
                  disabled={updating === listing._id}
                  style={{ padding: "5px 10px", background: listing.featured ? "#fff8c5" : "#f6f8fa", border: `1px solid ${listing.featured ? "#e3b341" : "#d0d7de"}`, borderRadius: "6px", fontSize: "11px", color: listing.featured ? "#7d4e00" : "#57606a", cursor: "pointer" }}>
                  {listing.featured ? "★ Featured" : "☆ Feature"}
                </button>
                <button onClick={() => deleteListing(listing._id)} disabled={updating === listing._id}
                  style={{ padding: "5px 8px", background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "6px", fontSize: "11px", color: "#cf222e", cursor: "pointer" }}>
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "12px", color: "#8c959f", marginTop: "12px" }}>{filtered.length} listing{filtered.length !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}
