"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  rentalId: string;
  listingId: string;
  dailyRate: number;
  deposit: number;
  availableFrom: string;
  availableTo?: string;
}

export default function BookingForm({ rentalId, listingId, dailyRate, deposit, availableFrom }: Props) {
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const minDate = availableFrom > today ? availableFrom.split("T")[0] : today;

  const days = startDate && endDate
    ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const totalRent = days > 0 ? days * dailyRate : 0;
  const totalPayable = totalRent + deposit;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) { setError("Please select both dates"); return; }
    if (days <= 0) { setError("End date must be after start date"); return; }

    setLoading(true);
    setError("");

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rentalId, startDate, endDate }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error); return; }
    router.push("/bookings?success=true");
  }

  return (
    <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "24px" }}>
      <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#0d1117", marginBottom: "20px" }}>Select dates</h2>

      {error && (
        <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "8px", padding: "12px 14px", fontSize: "13px", color: "#cf222e", marginBottom: "16px" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#0d1117", marginBottom: "6px" }}>
              Pick-up date
            </label>
            <input
              type="date"
              value={startDate}
              min={minDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "14px", color: "#0d1117", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#0d1117", marginBottom: "6px" }}>
              Return date
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate || minDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "14px", color: "#0d1117", outline: "none", boxSizing: "border-box" }}
            />
          </div>
        </div>

        {/* Price breakdown */}
        {days > 0 && (
          <div style={{ background: "#f6f8fa", border: "1px solid #e1e4e8", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117", marginBottom: "12px" }}>Price breakdown</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "#57606a" }}>PKR {dailyRate.toLocaleString()} × {days} day{days !== 1 ? "s" : ""}</span>
                <span style={{ color: "#0d1117" }}>PKR {totalRent.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "#57606a" }}>Security deposit (refundable)</span>
                <span style={{ color: "#0d1117" }}>PKR {deposit.toLocaleString()}</span>
              </div>
              <div style={{ borderTop: "1px solid #e1e4e8", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: 700 }}>
                <span style={{ color: "#0d1117" }}>Total payable</span>
                <span style={{ color: "#0d1117" }}>PKR {totalPayable.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ background: "#fff8c5", border: "1px solid #e3b341", borderRadius: "8px", padding: "12px 14px", fontSize: "12px", color: "#7d4e00", marginBottom: "20px", lineHeight: 1.5 }}>
          ⚠️ Your booking request will be sent to the owner for confirmation. Payment is made in person upon pickup.
        </div>

        <button
          type="submit"
          disabled={loading || days <= 0}
          style={{ width: "100%", padding: "12px", background: loading || days <= 0 ? "#8c959f" : "#0d1117", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: loading || days <= 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
        >
          {loading ? (
            <>
              <span style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />
              Sending request...
            </>
          ) : (
            "Request booking"
          )}
        </button>
      </form>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
