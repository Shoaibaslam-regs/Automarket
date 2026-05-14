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

  // ✅ POPUP STATES (ONLY ADD)
  const [popupOpen, setPopupOpen] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);

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
    setUpdating(id);
    await fetch(`/api/admin/listings/${id}`, { method: "DELETE" });
    setUpdating(null);
    fetchListings();
  }

  // ✅ POPUP HANDLERS
  function openDeletePopup(id: string) {
    setTargetId(id);
    setPopupOpen(true);
  }

  function closePopup() {
    setPopupOpen(false);
    setTargetId(null);
  }

  function confirmDelete() {
    if (targetId) deleteListing(targetId);
    closePopup();
  }

  const filtered = listings.filter(l => {
    const matchSearch =
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.make.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter ? l.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
    ACTIVE: { bg: "#dafbe1", color: "#1a7f37" },
    INACTIVE: { bg: "#f6f8fa", color: "#57606a" },
    PENDING: { bg: "#fff8c5", color: "#7d4e00" },
    SOLD: { bg: "#ddf4ff", color: "#0550ae" },
    RENTED: { bg: "#ffdfb6", color: "#953800" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", padding: "32px 16px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* SAME UI HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <a href="/admin" style={{ fontSize: "13px", color: "#57606a", textDecoration: "none" }}>← Admin</a>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0d1117", marginTop: "8px" }}>Listings</h1>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search listings..."
              style={{ padding: "8px 14px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", width: "200px", maxWidth: "100%" }} />

            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: "8px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none" }}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* LIST */}
        <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#57606a" }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#57606a" }}>No listings found</div>
          ) : (
            filtered.map(listing => (
              <div key={listing._id}
                style={{ padding: "14px 16px", borderBottom: "1px solid #f6f8fa", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>

                {/* IMAGE */}
                <div style={{ width: "64px", height: "48px", borderRadius: "6px", overflow: "hidden", background: "#f6f8fa", flexShrink: 0 }}>
                  {listing.images?.[0] ? (
                    <img src={listing.images[0]} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#8c959f" }}>
                      No img
                    </div>
                  )}
                </div>

                {/* INFO */}
                <div style={{ flex: 1, minWidth: "180px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600 }}>{listing.title}</p>
                  <p style={{ fontSize: "11px", color: "#57606a" }}>
                    {listing.make} {listing.model} · {listing.year} · PKR {listing.price.toLocaleString()}
                  </p>
                </div>

                {/* STATUS */}
                <span style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "20px",
                  background: STATUS_COLORS[listing.status]?.bg,
                  color: STATUS_COLORS[listing.status]?.color,
                }}>
                  {listing.status}
                </span>

                {/* ACTIONS (ONLY DELETE CHANGED) */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  <Link href={`/listings/${listing._id}`} target="_blank"
                    style={{ padding: "5px 10px", background: "#f6f8fa", border: "1px solid #d0d7de", borderRadius: "6px", fontSize: "11px" }}>
                    View
                  </Link>

                  <select
                    value={listing.status}
                    onChange={(e) => updateListing(listing._id, { status: e.target.value })}
                    style={{ padding: "5px 8px", border: "1px solid #d0d7de", borderRadius: "6px", fontSize: "11px" }}>
                    {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>

                  <button onClick={() => updateListing(listing._id, { featured: !listing.featured })}
                    style={{ padding: "5px 10px", background: "#fff8c5", border: "1px solid #d0d7de", borderRadius: "6px", fontSize: "11px" }}>
                    ★
                  </button>

                  {/* ✅ DELETE -> POPUP */}
                  <button onClick={() => openDeletePopup(listing._id)}
                    style={{ padding: "5px 8px", background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "6px", fontSize: "11px", color: "#cf222e" }}>
                    🗑
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ✅ POPUP (ONLY ADDITION) */}
      {popupOpen && (
        <div onClick={closePopup}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            zIndex: 100
          }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "white", padding: "20px", borderRadius: "12px", width: "100%", maxWidth: "360px" }}>
            <h3>Delete listing?</h3>
            <p style={{ fontSize: "13px", color: "#57606a" }}>This action cannot be undone.</p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
              <button onClick={closePopup} style={{ padding: "8px 14px" }}>Cancel</button>
              <button onClick={confirmDelete}
                style={{ padding: "8px 14px", background: "#cf222e", color: "white", border: "none", borderRadius: "6px" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}