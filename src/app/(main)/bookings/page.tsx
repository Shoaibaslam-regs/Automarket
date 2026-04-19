"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Booking = {
  _id: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  deposit: number;
  status: string;
  renterId: { name: string; email: string; phone?: string };
  rentalId: { listingId: string; dailyRate: number };
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING:   { bg: "#fff8c5", color: "#7d4e00" },
  CONFIRMED: { bg: "#dafbe1", color: "#1a7f37" },
  ACTIVE:    { bg: "#ddf4ff", color: "#0550ae" },
  COMPLETED: { bg: "#f6f8fa", color: "#57606a" },
  CANCELLED: { bg: "#fff0f0", color: "#cf222e" },
};

export default function BookingsPage() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"mine" | "received">("mine");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, [tab]);

  async function fetchBookings() {
    setLoading(true);
    const res = await fetch(`/api/bookings${tab === "received" ? "?role=owner" : ""}`);
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

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>

        {success && (
          <div style={{ background: "#dafbe1", border: "1px solid #56d364", borderRadius: "8px", padding: "14px 18px", fontSize: "14px", color: "#1a7f37", marginBottom: "24px", display: "flex", alignItems: "center", gap: "8px" }}>
            ✅ Booking request sent successfully! The owner will confirm shortly.
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0d1117" }}>Bookings</h1>
          <Link href="/listings?type=RENT"
            style={{ padding: "8px 16px", background: "#0d1117", color: "white", borderRadius: "8px", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
            Browse rentals
          </Link>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", background: "white", border: "1px solid #e1e4e8", borderRadius: "10px", padding: "4px", marginBottom: "20px", width: "fit-content" }}>
          {[["mine", "My bookings"], ["received", "Received requests"]].map(([val, label]) => (
            <button key={val} onClick={() => setTab(val as "mine" | "received")}
              style={{ padding: "7px 16px", borderRadius: "7px", border: "none", fontSize: "13px", fontWeight: 500, cursor: "pointer", background: tab === val ? "#0d1117" : "transparent", color: tab === val ? "white" : "#57606a" }}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", height: "100px", opacity: 0.5 }} />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "48px", textAlign: "center" }}>
            <p style={{ fontSize: "15px", color: "#0d1117", fontWeight: 500, marginBottom: "8px" }}>No bookings yet</p>
            <p style={{ fontSize: "13px", color: "#57606a", marginBottom: "20px" }}>
              {tab === "mine" ? "Browse available rentals and make your first booking." : "When someone books your vehicle, it will appear here."}
            </p>
            <Link href="/listings?type=RENT"
              style={{ fontSize: "13px", color: "#0d1117", fontWeight: 600, textDecoration: "underline" }}>
              Browse rentals →
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {bookings.map((booking) => {
              const statusStyle = STATUS_COLORS[booking.status] || STATUS_COLORS.PENDING;
              const days = Math.ceil((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / (1000 * 60 * 60 * 24));

              return (
                <div key={booking._id} style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117" }}>
                          {formatDate(booking.startDate)} → {formatDate(booking.endDate)}
                        </span>
                        <span style={{ fontSize: "11px", color: "#57606a" }}>({days} day{days !== 1 ? "s" : ""})</span>
                      </div>
                      {tab === "received" && booking.renterId && (
                        <p style={{ fontSize: "12px", color: "#57606a" }}>
                          Renter: {booking.renterId.name} · {booking.renterId.email}
                          {booking.renterId.phone && ` · ${booking.renterId.phone}`}
                        </p>
                      )}
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "20px", background: statusStyle.bg, color: statusStyle.color }}>
                      {booking.status}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "20px", marginBottom: "16px", padding: "12px", background: "#f6f8fa", borderRadius: "8px" }}>
                    <div>
                      <p style={{ fontSize: "11px", color: "#8c959f", marginBottom: "2px" }}>Rental amount</p>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "#0d1117" }}>PKR {booking.totalAmount.toLocaleString()}</p>
                    </div>
                    <div style={{ width: "1px", background: "#e1e4e8" }} />
                    <div>
                      <p style={{ fontSize: "11px", color: "#8c959f", marginBottom: "2px" }}>Security deposit</p>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "#0d1117" }}>PKR {booking.deposit.toLocaleString()}</p>
                    </div>
                    <div style={{ width: "1px", background: "#e1e4e8" }} />
                    <div>
                      <p style={{ fontSize: "11px", color: "#8c959f", marginBottom: "2px" }}>Total payable</p>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "#0d1117" }}>PKR {(booking.totalAmount + booking.deposit).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "8px" }}>
                    {tab === "received" && booking.status === "PENDING" && (
                      <>
                        <button onClick={() => updateStatus(booking._id, "CONFIRMED")}
                          disabled={updating === booking._id}
                          style={{ padding: "7px 16px", background: "#2da44e", color: "white", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                          {updating === booking._id ? "..." : "Confirm"}
                        </button>
                        <button onClick={() => updateStatus(booking._id, "CANCELLED")}
                          disabled={updating === booking._id}
                          style={{ padding: "7px 16px", background: "white", color: "#cf222e", border: "1px solid #ffcdd2", borderRadius: "7px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                          Decline
                        </button>
                      </>
                    )}
                    {tab === "received" && booking.status === "CONFIRMED" && (
                      <button onClick={() => updateStatus(booking._id, "COMPLETED")}
                        disabled={updating === booking._id}
                        style={{ padding: "7px 16px", background: "#0d1117", color: "white", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                        Mark completed
                      </button>
                    )}
                    {tab === "mine" && ["PENDING", "CONFIRMED"].includes(booking.status) && (
                      <button onClick={() => updateStatus(booking._id, "CANCELLED")}
                        disabled={updating === booking._id}
                        style={{ padding: "7px 16px", background: "white", color: "#cf222e", border: "1px solid #ffcdd2", borderRadius: "7px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                        Cancel booking
                      </button>
                    )}
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
