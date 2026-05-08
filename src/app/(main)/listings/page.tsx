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
  const [showFilters, setShowFilters] = useState(false);

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
      .then(r => r.json())
      .then(d => {
        setListings(d.listings || []);
        setPagination(d.pagination || { page: 1, pages: 1, total: 0 });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, type, make, condition, minPrice, maxPrice, location, sort]);

  function clearFilters() {
    setSearch(""); setType(""); setMake(""); setCondition("");
    setMinPrice(""); setMaxPrice(""); setLocation(""); setSort("createdAt");
    setPage(1);
  }

  const activeFilterCount = [type, make, condition, minPrice, maxPrice, location].filter(Boolean).length;

  const FilterPanel = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Type */}
      <div>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "#0d1117", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Type</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {[["", "All types"], ["SALE", "For Sale"], ["RENT", "For Rent"], ["BOTH", "Sale & Rent"]].map(([val, label]) => (
            <button key={val} onClick={() => { setType(val); setPage(1); }}
              style={{ textAlign: "left", padding: "8px 10px", borderRadius: "7px", border: "none", fontSize: "13px", cursor: "pointer", fontFamily: "inherit", background: type === val ? "#0d1117" : "transparent", color: type === val ? "white" : "#57606a", fontWeight: type === val ? 600 : 400, transition: "all 0.1s" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Make */}
      <div>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "#0d1117", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Make</p>
        <select value={make} onChange={e => { setMake(e.target.value); setPage(1); }}
          style={{ width: "100%", padding: "9px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", background: "white", color: "#0d1117" }}>
          <option value="">All makes</option>
          {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Condition */}
      <div>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "#0d1117", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Condition</p>
        <select value={condition} onChange={e => { setCondition(e.target.value); setPage(1); }}
          style={{ width: "100%", padding: "9px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", background: "white", color: "#0d1117" }}>
          <option value="">Any condition</option>
          {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Price */}
      <div>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "#0d1117", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Price (PKR)</p>
        <div style={{ display: "flex", gap: "8px" }}>
          <input type="number" placeholder="Min" value={minPrice} onChange={e => { setMinPrice(e.target.value); setPage(1); }}
            style={{ flex: 1, padding: "9px 10px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", minWidth: 0 }} />
          <input type="number" placeholder="Max" value={maxPrice} onChange={e => { setMaxPrice(e.target.value); setPage(1); }}
            style={{ flex: 1, padding: "9px 10px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", minWidth: 0 }} />
        </div>
      </div>

      {/* Location */}
      <div>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "#0d1117", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Location</p>
        <input type="text" placeholder="City or area" value={location} onChange={e => { setLocation(e.target.value); setPage(1); }}
          style={{ width: "100%", padding: "9px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
      </div>

      <button onClick={clearFilters}
        style={{ padding: "9px", background: "#f6f8fa", border: "1px solid #e1e4e8", borderRadius: "8px", fontSize: "13px", color: "#57606a", cursor: "pointer", fontFamily: "inherit" }}>
        Clear all filters
      </button>
    </div>
  );

  return (
    <>
      <style>{`
        .listings-layout { display: grid; grid-template-columns: 220px 1fr; gap: 20px; align-items: start; }
        .listings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
        .desktop-sidebar { display: block; }
        .mobile-filter-btn { display: none; }
        @media (max-width: 860px) {
          .listings-layout { grid-template-columns: 1fr; }
          .desktop-sidebar { display: none; }
          .mobile-filter-btn { display: flex !important; }
        }
        @media (max-width: 500px) {
          .listings-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px; }
        }
        @media (max-width: 360px) {
          .listings-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        <div style={{ maxWidth: "1140px", margin: "0 auto", padding: "20px 16px" }}>

          {/* Search + mobile filter btn */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            <input type="text" placeholder="Search by make, model, location..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ flex: 1, padding: "12px 16px", border: "1px solid #d0d7de", borderRadius: "10px", fontSize: "14px", outline: "none", background: "white", minWidth: 0 }} />

            {/* Mobile filter toggle */}
            <button className="mobile-filter-btn" onClick={() => setShowFilters(!showFilters)}
              style={{ padding: "12px 16px", background: showFilters ? "#0d1117" : "white", border: "1px solid #d0d7de", borderRadius: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer", color: showFilters ? "white" : "#0d1117", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, fontFamily: "inherit" }}>
              ⚙ Filters
              {activeFilterCount > 0 && (
                <span style={{ background: showFilters ? "white" : "#0d1117", color: showFilters ? "#0d1117" : "white", borderRadius: "20px", padding: "1px 6px", fontSize: "11px", fontWeight: 700 }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile filter panel */}
          {showFilters && (
            <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}
              className="mobile-filter-btn">
              <FilterPanel />
            </div>
          )}

          <div className="listings-layout">

            {/* Desktop sidebar */}
            <div className="desktop-sidebar">
              <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "20px", position: "sticky", top: "80px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#0d1117" }}>Filters</p>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} style={{ fontSize: "12px", color: "#cf222e", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                      Clear ({activeFilterCount})
                    </button>
                  )}
                </div>
                <FilterPanel />
              </div>
            </div>

            {/* Listings grid */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                <p style={{ fontSize: "13px", color: "#57606a" }}>
                  <strong style={{ color: "#0d1117" }}>{pagination.total}</strong> vehicle{pagination.total !== 1 ? "s" : ""} found
                </p>
                <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}
                  style={{ padding: "7px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", background: "white" }}>
                  <option value="createdAt">Newest first</option>
                  <option value="price">Price: low to high</option>
                </select>
              </div>

              {loading ? (
                <div className="listings-grid">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} style={{ background: "white", borderRadius: "12px", border: "1px solid #e1e4e8", height: "240px", opacity: 0.5 }}
                      className="animate-pulse" />
                  ))}
                </div>
              ) : listings.length === 0 ? (
                <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "60px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
                  <p style={{ fontSize: "16px", fontWeight: 600, color: "#0d1117", marginBottom: "6px" }}>No listings found</p>
                  <p style={{ fontSize: "13px", color: "#57606a", marginBottom: "16px" }}>Try adjusting your filters</p>
                  <button onClick={clearFilters} style={{ padding: "8px 20px", background: "#0d1117", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="listings-grid">
                  {listings.map(listing => (
                    <ListingCard key={listing._id} listing={listing} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "24px", flexWrap: "wrap" }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ padding: "8px 14px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1, background: "white", fontFamily: "inherit" }}>
                    ← Prev
                  </button>
                  {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
                    const p = i + 1;
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        style={{ padding: "8px 12px", borderRadius: "8px", fontSize: "13px", cursor: "pointer", border: "1px solid", borderColor: p === page ? "#0d1117" : "#d0d7de", background: p === page ? "#0d1117" : "white", color: p === page ? "white" : "#0d1117", fontWeight: p === page ? 700 : 400, fontFamily: "inherit" }}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
                    style={{ padding: "8px 14px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", cursor: page === pagination.pages ? "not-allowed" : "pointer", opacity: page === pagination.pages ? 0.4 : 1, background: "white", fontFamily: "inherit" }}>
                    Next →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
