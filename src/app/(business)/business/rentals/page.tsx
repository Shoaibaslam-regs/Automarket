"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Car, KeyRound } from "lucide-react";

type Booking = {
  _id: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  deposit: number;
  status: string;
  createdAt: string;
  confirmedAt?: string;
  renterId: { name: string; email: string; phone?: string };
  rentalId: { listingId: { title: string; make: string; model: string; images: string[] } };
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING:   { bg: "#fff8c5", color: "#7d4e00" },
  CONFIRMED: { bg: "#dafbe1", color: "#1a7f37" },
  ACTIVE:    { bg: "#ddf4ff", color: "#0550ae" },
  COMPLETED: { bg: "#f6f8fa", color: "#57606a" },
  CANCELLED: { bg: "#fff0f0", color: "#cf222e" },
};

export default function BusinessRentalsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => { fetchBookings(); }, []);

  async function fetchBookings() {
    const res = await fetch("/api/bookings?role=owner");
    const data = await res.json();
    setBookings(data.bookings || []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdating(null);
    fetchBookings();
  }

  function fmt(d: string) {
    return new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
  }

  const filtered = statusFilter ? bookings.filter(b => b.status === statusFilter) : bookings;
  const totalRevenue = bookings.filter(b => b.status === "COMPLETED").reduce((s, b) => s + b.totalAmount, 0);
  const activeCount = bookings.filter(b => b.status === "ACTIVE").length;
  const pendingCount = bookings.filter(b => b.status === "PENDING").length;

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

      {/* Header */}
      <div style={{ padding: "20px 24px", background: "white", borderBottom: "1px solid #e1e4e8", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <Link href="/business/dashboard" style={{ fontSize: "12px", color: "#57606a", textDecoration: "none" }}>← Dashboard</Link>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#0d1117", marginTop: "4px" }}>Rentals</h1>
        </div>
        <Link href="/sell" style={{ padding: "9px 18px", background: "#0d1117", color: "white", borderRadius: "8px", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
          + Add rental vehicle
        </Link>
      </div>

      <div style={{ padding: "20px 24px" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "14px", marginBottom: "20px" }}>
          {[
            { label: "Total bookings", value: bookings.length, color: "#0d1117" },
            { label: "Active rentals", value: activeCount, color: "#0550ae" },
            { label: "Pending requests", value: pendingCount, color: "#7d4e00" },
            { label: "Total revenue", value: `PKR ${(totalRevenue / 1000).toFixed(0)}K`, color: "#1a7f37" },
          ].map(s => (
            <div key={s.label} style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "10px", padding: "14px 16px" }}>
              <p style={{ fontSize: "11px", color: "#8c959f", marginBottom: "4px" }}>{s.label}</p>
              <p style={{ fontSize: "20px", fontWeight: 800, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
          {["", "PENDING", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ padding: "6px 14px", borderRadius: "20px", border: "1px solid", borderColor: statusFilter === s ? "#0d1117" : "#e1e4e8", background: statusFilter === s ? "#0d1117" : "white", color: statusFilter === s ? "white" : "#57606a", fontSize: "12px", fontWeight: statusFilter === s ? 600 : 400, cursor: "pointer", fontFamily: "inherit" }}>
              {s || "All"} {s && `(${bookings.filter(b => b.status === s).length})`}
            </button>
          ))}
        </div>

        {/* Bookings list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {loading ? (
            [1,2,3].map(i => <div key={i} style={{ background: "white", borderRadius: "12px", height: "120px", opacity: 0.4 }} />)
          ) : filtered.length === 0 ? (
            <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "48px", textAlign: "center" }}>
              <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#8c959f" }}><KeyRound size={25} strokeWidth={1.5} /></div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#0d1117" }}>No rental bookings yet</p>
              <p style={{ fontSize: "13px", color: "#57606a", marginTop: "4px" }}>Add a rental vehicle to start receiving bookings</p>
            </div>
          ) : filtered.map(booking => {
            const statusStyle = STATUS_COLORS[booking.status] || STATUS_COLORS.PENDING;
            const listing = booking.rentalId?.listingId;
            const days = Math.ceil((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / (1000 * 60 * 60 * 24));

            return (
              <div key={booking._id} style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "18px 20px" }}>
                <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", flexWrap: "wrap" }}>

                  {/* Vehicle thumbnail */}
                  <div style={{ width: "72px", height: "54px", borderRadius: "8px", background: "#f6f8fa", overflow: "hidden", flexShrink: 0 }}>
                    {listing?.images?.[0] ? (
                      <img src={listing.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#8c959f" }}><Car size={16} strokeWidth={1.5} /></div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: "180px" }}>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "#0d1117", marginBottom: "3px" }}>
                      {listing?.title || "Vehicle"}
                    </p>
                    <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", color: "#57606a" }}>{fmt(booking.startDate)} → {fmt(booking.endDate)} ({days}d)</span>
                      <span style={{ fontSize: "12px", color: "#57606a" }}>{booking.renterId?.name}</span>
                      {booking.renterId?.phone && (
                        <a href={`tel:${booking.renterId.phone}`} style={{ fontSize: "12px", color: "#0d1117", fontWeight: 600, textDecoration: "none" }}>{booking.renterId.phone}</a>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "16px" }}>
                      <div>
                        <span style={{ fontSize: "11px", color: "#8c959f" }}>Rental</span>
                        <p style={{ fontSize: "14px", fontWeight: 700, color: "#0d1117" }}>PKR {booking.totalAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <span style={{ fontSize: "11px", color: "#8c959f" }}>Deposit</span>
                        <p style={{ fontSize: "14px", fontWeight: 700, color: "#0d1117" }}>PKR {booking.deposit.toLocaleString()}</p>
                      </div>
                      <div>
                        <span style={{ fontSize: "11px", color: "#8c959f" }}>Total</span>
                        <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a7f37" }}>PKR {(booking.totalAmount + booking.deposit).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status + actions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: statusStyle.bg, color: statusStyle.color }}>
                      {booking.status}
                    </span>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {booking.status === "PENDING" && (
                        <>
                          <button onClick={() => updateStatus(booking._id, "CONFIRMED")} disabled={updating === booking._id}
                            style={{ padding: "6px 12px", background: "#2da44e", color: "white", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                            Confirm
                          </button>
                          <button onClick={() => updateStatus(booking._id, "CANCELLED")} disabled={updating === booking._id}
                            style={{ padding: "6px 12px", background: "white", color: "#cf222e", border: "1px solid #ffcdd2", borderRadius: "7px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
                            Decline
                          </button>
                        </>
                      )}
                      {booking.status === "CONFIRMED" && (
                        <button onClick={() => updateStatus(booking._id, "COMPLETED")} disabled={updating === booking._id}
                          style={{ padding: "6px 12px", background: "#0d1117", color: "white", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                          Mark completed
                        </button>
                      )}
                      {booking.renterId?.phone && (
                        <a href={`https://wa.me/${booking.renterId.phone.replace(/\D/g, "")}?text=Hi ${booking.renterId.name}, regarding your rental booking`}
                          target="_blank" rel="noreferrer"
                          style={{ padding: "6px 12px", background: "#f6f8fa", border: "1px solid #e1e4e8", borderRadius: "7px", fontSize: "12px", color: "#0d1117", textDecoration: "none" }}>
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
