"use client";

import { useState, useEffect } from "react";

type Booking = {
  _id: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  deposit: number;
  status: string;
  createdAt: string;
  renterId: { name: string; email: string };
  rentalId: { listingId: { title: string; make: string; model: string } };
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING:   { bg: "#fff8c5", color: "#7d4e00" },
  CONFIRMED: { bg: "#dafbe1", color: "#1a7f37" },
  COMPLETED: { bg: "#f6f8fa", color: "#57606a" },
  CANCELLED: { bg: "#fff0f0", color: "#cf222e" },
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetch("/api/bookings?role=owner&admin=true")
      .then(r => r.json())
      .then(d => { setBookings(d.bookings || []); setLoading(false); });
  }, []);

  const filtered = bookings.filter(b => {
    const matchSearch = b.renterId?.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.renterId?.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter ? b.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  function fmt(d: string) {
    return new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
  }

  const totalRevenue = bookings.filter(b => b.status === "COMPLETED").reduce((s, b) => s + b.totalAmount, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <a href="/admin" style={{ fontSize: "13px", color: "#57606a", textDecoration: "none" }}>← Admin</a>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0d1117", marginTop: "8px" }}>All bookings</h1>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by renter..."
              style={{ padding: "8px 14px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", width: "200px" }} />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: "8px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none" }}>
              <option value="">All statuses</option>
              {["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Revenue summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "24px" }}>
          {[
            { label: "Total bookings", value: bookings.length },
            { label: "Pending", value: bookings.filter(b => b.status === "PENDING").length },
            { label: "Completed", value: bookings.filter(b => b.status === "COMPLETED").length },
            { label: "Total rental revenue", value: `PKR ${totalRevenue.toLocaleString()}` },
          ].map(s => (
            <div key={s.label} style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "10px", padding: "14px 16px" }}>
              <p style={{ fontSize: "11px", color: "#8c959f", marginBottom: "4px" }}>{s.label}</p>
              <p style={{ fontSize: "18px", fontWeight: 700, color: "#0d1117" }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #e1e4e8", background: "#f6f8fa", display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr", gap: "12px" }}>
            {["Renter", "Vehicle", "Dates", "Amount", "Status"].map(h => (
              <p key={h} style={{ fontSize: "11px", fontWeight: 600, color: "#57606a", textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</p>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#57606a" }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#57606a" }}>No bookings found</div>
          ) : filtered.map(booking => {
            const listing = booking.rentalId?.listingId;
            const statusStyle = STATUS_COLORS[booking.status] || STATUS_COLORS.PENDING;
            return (
              <div key={booking._id} style={{ padding: "14px 20px", borderBottom: "1px solid #f6f8fa", display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr", gap: "12px", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "#0d1117" }}>{booking.renterId?.name || "Unknown"}</p>
                  <p style={{ fontSize: "11px", color: "#8c959f" }}>{booking.renterId?.email}</p>
                </div>
                <div>
                  <p style={{ fontSize: "12px", color: "#0d1117", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {listing?.title || "Unknown vehicle"}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: "11px", color: "#57606a" }}>{fmt(booking.startDate)}</p>
                  <p style={{ fontSize: "11px", color: "#57606a" }}>{fmt(booking.endDate)}</p>
                </div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117" }}>PKR {booking.totalAmount.toLocaleString()}</p>
                <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", background: statusStyle.bg, color: statusStyle.color, width: "fit-content" }}>
                  {booking.status}
                </span>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: "12px", color: "#8c959f", marginTop: "12px" }}>{filtered.length} booking{filtered.length !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}
