"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Vehicle = {
  _id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price: number;
  status: string;
  type: string;
  images: string[];
  mileage?: number;
  color?: string;
  condition: string;
  location: string;
  createdAt: string;
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  ACTIVE:   { bg: "#dafbe1", color: "#1a7f37" },
  SOLD:     { bg: "#ddf4ff", color: "#0550ae" },
  PENDING:  { bg: "#fff8c5", color: "#7d4e00" },
  INACTIVE: { bg: "#f6f8fa", color: "#57606a" },
  RENTED:   { bg: "#ffdfb6", color: "#953800" },
};

export default function InventoryPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/listings?limit=100")
      .then(r => r.json())
      .then(d => { setVehicles(d.listings || []); setLoading(false); });
  }, []);

  async function deleteVehicle(id: string) {
    if (!confirm("Delete this vehicle?")) return;
    setDeleting(id);
    await fetch(`/api/listings/${id}`, { method: "DELETE" });
    setVehicles(prev => prev.filter(v => v._id !== id));
    setDeleting(null);
  }

  const filtered = vehicles.filter(v => {
    const matchSearch = v.title.toLowerCase().includes(search.toLowerCase()) ||
      v.make.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter ? v.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

      {/* Header */}
      <div style={{ padding: "20px 24px", background: "white", borderBottom: "1px solid #e1e4e8", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <Link href="/business/dashboard" style={{ fontSize: "12px", color: "#57606a", textDecoration: "none" }}>← Dashboard</Link>
          </div>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#0d1117" }}>Inventory</h1>
        </div>
        <Link href="/sell"
          style={{ padding: "9px 18px", background: "#0d1117", color: "white", borderRadius: "8px", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
          + Add vehicle
        </Link>
      </div>

      <div style={{ padding: "20px 24px" }}>
        {/* Filters */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vehicles..."
            style={{ flex: 1, minWidth: "200px", padding: "9px 14px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", background: "white" }} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: "9px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", background: "white" }}>
            <option value="">All statuses</option>
            {["ACTIVE", "SOLD", "PENDING", "INACTIVE", "RENTED"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div style={{ display: "flex", border: "1px solid #d0d7de", borderRadius: "8px", overflow: "hidden" }}>
            {(["grid", "list"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: "9px 12px", background: view === v ? "#0d1117" : "white", color: view === v ? "white" : "#57606a", border: "none", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
                {v === "grid" ? "⊞" : "☰"}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          {[
            { label: "Total", count: vehicles.length, color: "#0d1117" },
            { label: "Available", count: vehicles.filter(v => v.status === "ACTIVE").length, color: "#1a7f37" },
            { label: "Sold", count: vehicles.filter(v => v.status === "SOLD").length, color: "#0550ae" },
            { label: "Reserved", count: vehicles.filter(v => v.status === "PENDING").length, color: "#7d4e00" },
          ].map(s => (
            <div key={s.label} style={{ padding: "6px 14px", background: "white", border: "1px solid #e1e4e8", borderRadius: "20px", fontSize: "12px", fontWeight: 600, color: s.color }}>
              {s.label}: {s.count}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px" }}>
            {[1,2,3,4,5,6].map(i => <div key={i} style={{ background: "white", borderRadius: "12px", height: "220px", opacity: 0.4 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "60px", textAlign: "center" }}>
            <p style={{ fontSize: "40px", marginBottom: "12px" }}>🚗</p>
            <p style={{ fontSize: "15px", fontWeight: 600, color: "#0d1117", marginBottom: "8px" }}>No vehicles found</p>
            <Link href="/sell" style={{ fontSize: "13px", color: "#0d1117", fontWeight: 600 }}>Add your first vehicle →</Link>
          </div>
        ) : view === "grid" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "14px" }}>
            {filtered.map(v => {
              const statusStyle = STATUS_COLORS[v.status] || STATUS_COLORS.INACTIVE;
              return (
                <div key={v._id} style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", overflow: "hidden" }}>
                  <div style={{ height: "140px", background: "#f6f8fa", position: "relative", overflow: "hidden" }}>
                    {v.images?.[0] ? (
                      <img src={v.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: "32px" }}>🚗</div>
                    )}
                    <span style={{ position: "absolute", top: "8px", left: "8px", fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: statusStyle.bg, color: statusStyle.color }}>
                      {v.status}
                    </span>
                  </div>
                  <div style={{ padding: "12px" }}>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "#0d1117", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title}</p>
                    <p style={{ fontSize: "11px", color: "#8c959f", marginBottom: "8px" }}>{v.make} {v.model} · {v.year} · {v.mileage?.toLocaleString()} km</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <span style={{ fontSize: "14px", fontWeight: 800, color: "#0d1117" }}>PKR {v.price.toLocaleString()}</span>
                      <span style={{ fontSize: "10px", color: "#8c959f" }}>{v.condition}</span>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <Link href={`/listings/${v._id}`}
                        style={{ flex: 1, textAlign: "center", padding: "6px", background: "#f6f8fa", border: "1px solid #e1e4e8", borderRadius: "7px", fontSize: "11px", fontWeight: 600, color: "#0d1117", textDecoration: "none" }}>
                        View
                      </Link>
                      <button onClick={() => deleteVehicle(v._id)} disabled={deleting === v._id}
                        style={{ padding: "6px 10px", background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "7px", fontSize: "11px", color: "#cf222e", cursor: "pointer", fontFamily: "inherit" }}>
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", overflow: "hidden" }}>
            {filtered.map((v, i) => {
              const statusStyle = STATUS_COLORS[v.status] || STATUS_COLORS.INACTIVE;
              return (
                <div key={v._id} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 20px", borderBottom: i < filtered.length - 1 ? "1px solid #f6f8fa" : "none" }}>
                  <div style={{ width: "60px", height: "44px", borderRadius: "6px", background: "#f6f8fa", overflow: "hidden", flexShrink: 0 }}>
                    {v.images?.[0] ? <img src={v.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>🚗</div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title}</p>
                    <p style={{ fontSize: "11px", color: "#8c959f" }}>{v.make} · {v.year} · {v.mileage?.toLocaleString()} km</p>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", background: statusStyle.bg, color: statusStyle.color, flexShrink: 0 }}>{v.status}</span>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#0d1117", flexShrink: 0 }}>PKR {v.price.toLocaleString()}</p>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <Link href={`/listings/${v._id}`} style={{ padding: "5px 10px", background: "#f6f8fa", border: "1px solid #e1e4e8", borderRadius: "6px", fontSize: "11px", color: "#0d1117", textDecoration: "none", fontWeight: 600 }}>View</Link>
                    <button onClick={() => deleteVehicle(v._id)} disabled={deleting === v._id}
                      style={{ padding: "5px 8px", background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "6px", fontSize: "11px", color: "#cf222e", cursor: "pointer", fontFamily: "inherit" }}>🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
