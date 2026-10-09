"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Trash2, TriangleAlert } from "lucide-react";
import { refreshNotificationCounts } from "@/hooks/useNotificationCounts";

type ListingInfo = {
  _id: string;
  title: string;
  images: string[];
  make: string;
  model: string;
  year: number;
  location: string;
};

type OwnerInfo = {
  name?: string;
  email?: string;
  phone?: string;
};

type Booking = {
  _id: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  deposit: number;
  status: string;
  createdAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
  renterId: { name: string; email: string; phone?: string };
  rentalId: { _id: string; listingId: ListingInfo; dailyRate: number };
  owner?: OwnerInfo;
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING:   { bg: "#fff8c5", color: "#7d4e00" },
  CONFIRMED: { bg: "#dafbe1", color: "#1a7f37" },
  ACTIVE:    { bg: "#ddf4ff", color: "#0550ae" },
  COMPLETED: { bg: "#f6f8fa", color: "#57606a" },
  CANCELLED: { bg: "#fff0f0", color: "#cf222e" },
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

function fmtTime(d: string) {
  return new Date(d).toLocaleString("en-PK", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function generateSlip(booking: Booking, tab: string) {
  const listing = booking.rentalId?.listingId;
  const days = Math.ceil((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / (1000 * 60 * 60 * 24));
  const statusStyle = STATUS_COLORS[booking.status] || STATUS_COLORS.PENDING;
  const html = `<!DOCTYPE html><html><head><title>Booking Slip — AutoMarket</title>
  <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:40px auto;color:#0d1117;padding:0 20px}.header{text-align:center;border-bottom:2px solid #0d1117;padding-bottom:20px;margin-bottom:24px}.logo{font-size:24px;font-weight:800}.section{margin-bottom:20px}.section-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#57606a;margin-bottom:10px;border-bottom:1px solid #e1e4e8;padding-bottom:6px}.row{display:flex;justify-content:space-between;font-size:13px;padding:5px 0}.label{color:#57606a}.value{font-weight:600}.total-row{display:flex;justify-content:space-between;font-size:15px;font-weight:700;padding:12px 0;border-top:2px solid #0d1117;margin-top:8px}.status-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;background:${statusStyle.bg};color:${statusStyle.color}}.footer{text-align:center;font-size:11px;color:#8c959f;margin-top:32px;border-top:1px solid #e1e4e8;padding-top:16px}</style>
  </head><body>
  <div class="header"><div class="logo">AutoMarket</div><div style="font-size:14px;color:#57606a;margin-top:4px">Rental Booking Slip</div><div style="font-size:11px;color:#8c959f;margin-top:4px">Booking ID: ${booking._id}</div></div>
  <div class="section"><div class="section-title">Vehicle details</div>
  <div class="row"><span class="label">Vehicle</span><span class="value">${listing?.title || "N/A"}</span></div>
  <div class="row"><span class="label">Make & model</span><span class="value">${listing?.make} ${listing?.model} ${listing?.year}</span></div>
  <div class="row"><span class="label">Location</span><span class="value">${listing?.location || "N/A"}</span></div></div>
  <div class="section"><div class="section-title">Booking details</div>
  <div class="row"><span class="label">Pick-up</span><span class="value">${fmt(booking.startDate)}</span></div>
  <div class="row"><span class="label">Return</span><span class="value">${fmt(booking.endDate)}</span></div>
  <div class="row"><span class="label">Duration</span><span class="value">${days} day${days !== 1 ? "s" : ""}</span></div>
  <div class="row"><span class="label">Status</span><span><span class="status-badge">${booking.status}</span></span></div>
  <div class="row"><span class="label">Requested on</span><span class="value">${fmtTime(booking.createdAt)}</span></div>
  ${booking.confirmedAt ? `<div class="row"><span class="label">Confirmed on</span><span class="value">${fmtTime(booking.confirmedAt)}</span></div>` : ""}
  ${booking.cancelledAt ? `<div class="row"><span class="label">Cancelled on</span><span class="value">${fmtTime(booking.cancelledAt)}</span></div>` : ""}
  </div>
  ${tab === "received" ? `<div class="section"><div class="section-title">Renter details</div>
  <div class="row"><span class="label">Name</span><span class="value">${booking.renterId?.name || "N/A"}</span></div>
  <div class="row"><span class="label">Email</span><span class="value">${booking.renterId?.email || "N/A"}</span></div>
  ${booking.renterId?.phone ? `<div class="row"><span class="label">Phone</span><span class="value">${booking.renterId.phone}</span></div>` : ""}
  </div>` : `<div class="section"><div class="section-title">Owner details</div>
  <div class="row"><span class="label">Name</span><span class="value">${booking.owner?.name || "N/A"}</span></div>
  <div class="row"><span class="label">Email</span><span class="value">${booking.owner?.email || "N/A"}</span></div>
  ${booking.owner?.phone ? `<div class="row"><span class="label">Phone</span><span class="value">${booking.owner.phone}</span></div>` : ""}
  </div>`}
  <div class="section"><div class="section-title">Payment summary</div>
  <div class="row"><span class="label">Rental × ${days} days</span><span class="value">PKR ${booking.totalAmount.toLocaleString()}</span></div>
  <div class="row"><span class="label">Security deposit</span><span class="value">PKR ${booking.deposit.toLocaleString()}</span></div>
  <div class="total-row"><span>Total payable</span><span>PKR ${(booking.totalAmount + booking.deposit).toLocaleString()}</span></div></div>
  <div class="footer">Generated by AutoMarket Pakistan · ${new Date().toLocaleString("en-PK")}</div>
  <script>window.onload=()=>window.print();</script></body></html>`;
  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}

function ConfirmPopup({ title = "Remove this booking?", message, icon = <Trash2 size={20} strokeWidth={1.75} />, confirmLabel = "Remove", loadingLabel = "Removing...", cancelLabel = "Cancel", onConfirm, onCancel, loading, error }: {
  title?: string; message: string; icon?: React.ReactNode; confirmLabel?: string; loadingLabel?: string; cancelLabel?: string;
  onConfirm: () => void; onCancel: () => void; loading: boolean; error?: string;
}) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: "12px", width: "100%", maxWidth: "400px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
        <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ width: "40px", height: "40px", background: "#fff0f0", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{icon}</div>
          <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "#8c959f", fontSize: "20px" }}>×</button>
        </div>
        <div style={{ padding: "16px 24px 24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0d1117", marginBottom: "8px" }}>{title}</h3>
          <p style={{ fontSize: "14px", color: "#57606a", lineHeight: 1.6, marginBottom: error ? "12px" : "24px" }}>{message}</p>
          {error && <div role="alert" style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "#cf222e", marginBottom: "16px" }}>{error}</div>}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button onClick={onCancel} disabled={loading} style={{ padding: "8px 18px", background: "#f6f8fa", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "14px", fontWeight: 500, color: "#0d1117", cursor: "pointer" }}>{cancelLabel}</button>
            <button onClick={onConfirm} disabled={loading} style={{ padding: "8px 18px", background: "#cf222e", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, color: "white", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? loadingLabel : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBanner({ status, tab }: { status: string; tab: string }) {
  if (tab === "received" && status === "PENDING") return (
    <div style={{ background: "#fff8c5", border: "1px solid #e3b341", borderRadius: "7px", padding: "8px 12px", fontSize: "12px", color: "#7d4e00", fontWeight: 500, marginBottom: "14px" }}>
      New booking request — action required
    </div>
  );
  if (tab === "mine") {
    if (status === "CONFIRMED") return (
      <div style={{ background: "#dafbe1", border: "1px solid #56d364", borderRadius: "7px", padding: "10px 14px", fontSize: "13px", color: "#1a7f37", fontWeight: 500, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
        <div><p style={{ fontWeight: 600, margin: 0 }}>Booking confirmed!</p><p style={{ fontWeight: 400, fontSize: "12px", margin: "2px 0 0", opacity: 0.8 }}>Contact the owner to arrange pickup.</p></div>
      </div>
    );
    if (status === "PENDING") return (
      <div style={{ background: "#fff8c5", border: "1px solid #e3b341", borderRadius: "7px", padding: "10px 14px", fontSize: "13px", color: "#7d4e00", fontWeight: 500, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
        <div><p style={{ fontWeight: 600, margin: 0 }}>Waiting for owner confirmation</p></div>
      </div>
    );
    if (status === "CANCELLED") return (
      <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "7px", padding: "10px 14px", fontSize: "13px", color: "#cf222e", fontWeight: 500, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
        <div><p style={{ fontWeight: 600, margin: 0 }}>Booking declined or cancelled</p></div>
      </div>
    );
    if (status === "COMPLETED") return (
      <div style={{ background: "#f6f8fa", border: "1px solid #d0d7de", borderRadius: "7px", padding: "10px 14px", fontSize: "13px", color: "#57606a", fontWeight: 500, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
        <p style={{ fontWeight: 600, margin: 0 }}>Rental completed</p>
      </div>
    );
  }
  return null;
}

export default function BookingsContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"mine" | "received">("mine");
  const [updating, setUpdating] = useState<string | null>(null);
  const [ownerCount, setOwnerCount] = useState(0);
  const [renterCount, setRenterCount] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [cancelTarget, setCancelTarget] = useState<{ id: string; action: "cancel" | "decline" } | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/bookings${tab === "received" ? "?role=owner" : ""}`);
    const data = await res.json();
    setBookings(data.bookings || []);
    setLoading(false);
  }, [tab]);

  async function fetchCounts() {
    try {
      const res = await fetch("/api/bookings/count");
      const data = await res.json();
      setOwnerCount(data.ownerCount || 0);
      setRenterCount(data.renterCount || 0);
    } catch { }
    // Keep the nav badges in sync after bookings are seen/confirmed/declined
    refreshNotificationCounts();
  }

  async function markAsSeen() {
    await fetch("/api/bookings/seen", { method: "POST" });
    fetchCounts();
  }

  useEffect(() => { fetchBookings(); fetchCounts(); }, [fetchBookings]);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    await fetch(`/api/bookings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setUpdating(null);
    fetchBookings();
    fetchCounts();
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    await updateStatus(cancelTarget.id, "CANCELLED");
    setCancelTarget(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    const res = await fetch(`/api/bookings/${deleteTarget}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error || "Couldn't remove this booking. Please try again.");
      return;
    }
    setDeleteTarget(null);
    fetchBookings();
    fetchCounts();
  }

  return (
    <div className="adm-page">
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>

        {deleteTarget && <ConfirmPopup message="This booking will be removed from your view." onConfirm={confirmDelete} onCancel={() => { setDeleteTarget(null); setDeleteError(""); }} loading={deleting} error={deleteError} />}
        {cancelTarget && (
          <ConfirmPopup
            icon={<TriangleAlert size={20} strokeWidth={1.75} />}
            title={cancelTarget.action === "decline" ? "Decline this booking request?" : "Cancel this booking?"}
            message={cancelTarget.action === "decline"
              ? "This booking request will be declined and marked as cancelled. This cannot be undone."
              : "Your booking request will be cancelled. You'll need to send a new request if you change your mind."}
            confirmLabel={cancelTarget.action === "decline" ? "Yes, decline" : "Yes, cancel booking"}
            loadingLabel={cancelTarget.action === "decline" ? "Declining..." : "Cancelling..."}
            cancelLabel={cancelTarget.action === "decline" ? "Keep request" : "Keep booking"}
            onConfirm={confirmCancel}
            onCancel={() => setCancelTarget(null)}
            loading={updating === cancelTarget.id}
          />
        )}

        {success && (
          <div style={{ background: "#dafbe1", border: "1px solid #56d364", borderRadius: "8px", padding: "14px 18px", fontSize: "14px", color: "#1a7f37", marginBottom: "24px" }}>
            Booking request sent! The owner will confirm shortly.
          </div>
        )}

        <div className="adm-header">
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0d1117" }}>Bookings</h1>
          <Link href="/listings?type=RENT" style={{ padding: "8px 16px", background: "#0d1117", color: "white", borderRadius: "8px", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
            Browse rentals
          </Link>
        </div>

        <div className="adm-tabs">
          <button onClick={() => { setTab("mine"); markAsSeen(); }}
            style={{ padding: "7px 16px", borderRadius: "7px", border: "none", fontSize: "13px", fontWeight: 500, cursor: "pointer", background: tab === "mine" ? "#0d1117" : "transparent", color: tab === "mine" ? "white" : "#57606a", display: "flex", alignItems: "center", gap: "6px" }}>
            My bookings
            {renterCount > 0 && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "18px", height: "18px", background: tab === "mine" ? "white" : "#cf222e", color: tab === "mine" ? "#cf222e" : "white", fontSize: "11px", fontWeight: 700, borderRadius: "20px", padding: "0 5px" }}>{renterCount}</span>}
          </button>
          <button onClick={() => setTab("received")}
            style={{ padding: "7px 16px", borderRadius: "7px", border: "none", fontSize: "13px", fontWeight: 500, cursor: "pointer", background: tab === "received" ? "#0d1117" : "transparent", color: tab === "received" ? "white" : "#57606a", display: "flex", alignItems: "center", gap: "6px" }}>
            Received requests
            {ownerCount > 0 && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "18px", height: "18px", background: tab === "received" ? "white" : "#cf222e", color: tab === "received" ? "#cf222e" : "white", fontSize: "11px", fontWeight: 700, borderRadius: "20px", padding: "0 5px" }}>{ownerCount}</span>}
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[1,2,3].map(i => <div key={i} style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", height: "140px", opacity: 0.4 }} />)}
          </div>
        ) : bookings.length === 0 ? (
          <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "48px", textAlign: "center" }}>
            <p style={{ fontSize: "15px", color: "#0d1117", fontWeight: 500, marginBottom: "8px" }}>No bookings yet</p>
            <p style={{ fontSize: "13px", color: "#57606a", marginBottom: "20px" }}>{tab === "mine" ? "Browse available rentals and make your first booking." : "When someone books your vehicle, it will appear here."}</p>
            <Link href="/listings?type=RENT" style={{ fontSize: "13px", color: "#0d1117", fontWeight: 600, textDecoration: "underline" }}>Browse rentals →</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {bookings.map(booking => {
              const statusStyle = STATUS_COLORS[booking.status] || STATUS_COLORS.PENDING;
              const days = Math.ceil((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / (1000 * 60 * 60 * 24));
              const listing = booking.rentalId?.listingId as ListingInfo | undefined;
              const listingId = listing?._id;
              return (
                <div key={booking._id} className="bk-card" style={{ background: "white", border: booking.status === "PENDING" && tab === "received" ? "1px solid #e3b341" : booking.status === "CONFIRMED" && tab === "mine" ? "1px solid #56d364" : "1px solid #e1e4e8", borderRadius: "12px" }}>
                  <StatusBanner status={booking.status} tab={tab} />

                  {listing && (
                    <div className="bk-listing" style={{ display: "flex", gap: "12px", marginBottom: "16px", padding: "12px", background: "#f6f8fa", borderRadius: "8px", alignItems: "center" }}>
                      <div style={{ position: "relative", width: "64px", height: "48px", borderRadius: "6px", overflow: "hidden", flexShrink: 0, background: "#e1e4e8" }}>
                        {listing.images?.[0] ? <Image src={listing.images[0]} alt="" fill sizes="64px" className="object-cover" /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#8c959f" }}>No img</div>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{listing.title}</p>
                        <p style={{ fontSize: "12px", color: "#57606a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{listing.make} {listing.model} · {listing.year} · {listing.location}</p>
                      </div>
                      {tab === "mine" && listingId && (
                        <Link className="bk-listing-actions" href={`/listings/${listingId}`} style={{ textAlign: "center", padding: "6px 12px", background: "white", border: "1px solid #d0d7de", borderRadius: "6px", fontSize: "12px", fontWeight: 500, color: "#0d1117", textDecoration: "none", flexShrink: 0 }}>View listing →</Link>
                      )}
                      {tab === "received" && booking.renterId && (
                        <div className="bk-listing-actions" style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                          {booking.renterId.phone && (
                            <>
                              <a href={`tel:${booking.renterId.phone}`} style={{ padding: "6px 12px", background: "#0d1117", color: "white", borderRadius: "6px", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>Call</a>
                              <a href={`https://wa.me/${booking.renterId.phone.replace(/\D/g, "")}?text=Hi ${booking.renterId.name}`} target="_blank" rel="noreferrer" style={{ padding: "6px 12px", background: "#2da44e", color: "white", borderRadius: "6px", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>WhatsApp</a>
                            </>
                          )}
                          <a href={`mailto:${booking.renterId.email}`} style={{ padding: "6px 12px", background: "white", border: "1px solid #d0d7de", color: "#0d1117", borderRadius: "6px", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>Email</a>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px", gap: "12px" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px 10px", marginBottom: "6px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117" }}>{fmt(booking.startDate)} → {fmt(booking.endDate)}</span>
                        <span style={{ fontSize: "11px", color: "#57606a" }}>({days} day{days !== 1 ? "s" : ""})</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", color: "#8c959f" }}>Requested: {fmtTime(booking.createdAt)}</span>
                        {booking.confirmedAt && <span style={{ fontSize: "11px", color: "#1a7f37" }}>Confirmed: {fmtTime(booking.confirmedAt)}</span>}
                        {booking.cancelledAt && <span style={{ fontSize: "11px", color: "#cf222e" }}>Cancelled: {fmtTime(booking.cancelledAt)}</span>}
                      </div>
                      {tab === "received" && booking.renterId && (
                        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "12px", color: "#57606a" }}>{booking.renterId.name}</span>
                          <a href={`mailto:${booking.renterId.email}`} style={{ fontSize: "12px", color: "#57606a", textDecoration: "none" }}>{booking.renterId.email}</a>
                          {booking.renterId.phone ? <a href={`tel:${booking.renterId.phone}`} style={{ fontSize: "12px", color: "#0d1117", fontWeight: 600, textDecoration: "none" }}>{booking.renterId.phone}</a> : <span style={{ fontSize: "12px", color: "#8c959f" }}>No phone added</span>}
                        </div>
                      )}
                      {tab === "mine" && booking.status === "CONFIRMED" && booking.owner && (
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "8px", padding: "10px 12px", background: "#dafbe1", borderRadius: "7px", border: "1px solid #56d364" }}>
                          <span style={{ fontSize: "12px", color: "#1a7f37", fontWeight: 600 }}>Owner:</span>
                          {booking.owner.name && <span style={{ fontSize: "12px", color: "#1a7f37" }}>{booking.owner.name}</span>}
                          {booking.owner.phone && <a href={`tel:${booking.owner.phone}`} style={{ fontSize: "12px", color: "#1a7f37", fontWeight: 600, textDecoration: "none" }}>{booking.owner.phone}</a>}
                          {booking.owner.email && <a href={`mailto:${booking.owner.email}`} style={{ fontSize: "12px", color: "#1a7f37", textDecoration: "none" }}>{booking.owner.email}</a>}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "20px", background: statusStyle.bg, color: statusStyle.color, flexShrink: 0 }}>{booking.status}</span>
                  </div>

                  <div className="bk-amounts" style={{ display: "flex", gap: "20px", marginBottom: "14px", padding: "12px 16px", background: "#f6f8fa", borderRadius: "8px" }}>
                    <div><p style={{ fontSize: "11px", color: "#8c959f", marginBottom: "2px" }}>Rental amount</p><p style={{ fontSize: "14px", fontWeight: 700, color: "#0d1117" }}>PKR {booking.totalAmount.toLocaleString()}</p></div>
                    <div style={{ width: "1px", background: "#e1e4e8" }} />
                    <div><p style={{ fontSize: "11px", color: "#8c959f", marginBottom: "2px" }}>Deposit</p><p style={{ fontSize: "14px", fontWeight: 700, color: "#0d1117" }}>PKR {booking.deposit.toLocaleString()}</p></div>
                    <div style={{ width: "1px", background: "#e1e4e8" }} />
                    <div><p style={{ fontSize: "11px", color: "#8c959f", marginBottom: "2px" }}>Total</p><p style={{ fontSize: "14px", fontWeight: 700, color: "#0d1117" }}>PKR {(booking.totalAmount + booking.deposit).toLocaleString()}</p></div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    {tab === "received" && booking.status === "PENDING" && (
                      <>
                        <button onClick={() => updateStatus(booking._id, "CONFIRMED")} disabled={updating === booking._id} style={{ padding: "8px 18px", background: "#2da44e", color: "white", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: "pointer", opacity: updating === booking._id ? 0.6 : 1 }}>{updating === booking._id ? "..." : "Confirm"}</button>
                        <button onClick={() => setCancelTarget({ id: booking._id, action: "decline" })} disabled={updating === booking._id} style={{ padding: "8px 18px", background: "white", color: "#cf222e", border: "1px solid #ffcdd2", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Decline</button>
                      </>
                    )}
                    {tab === "received" && booking.status === "CONFIRMED" && (
                      <button onClick={() => updateStatus(booking._id, "COMPLETED")} disabled={updating === booking._id} style={{ padding: "8px 18px", background: "#0d1117", color: "white", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Mark as completed</button>
                    )}
                    {tab === "mine" && ["PENDING", "CONFIRMED"].includes(booking.status) && (
                      <button onClick={() => setCancelTarget({ id: booking._id, action: "cancel" })} disabled={updating === booking._id} style={{ padding: "8px 18px", background: "white", color: "#cf222e", border: "1px solid #ffcdd2", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Cancel booking</button>
                    )}
                    {["CONFIRMED", "COMPLETED"].includes(booking.status) && (
                      <button onClick={() => generateSlip(booking, tab)} style={{ padding: "8px 16px", background: "white", border: "1px solid #d0d7de", color: "#0d1117", borderRadius: "7px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Generate slip</button>
                    )}
                    {/* A booking whose vehicle was deleted can always be cleared away */}
                    {(["COMPLETED", "CANCELLED"].includes(booking.status) || !booking.rentalId) && (
                      <button onClick={() => setDeleteTarget(booking._id)} style={{ padding: "8px 14px", background: "white", color: "#8c959f", border: "1px solid #e1e4e8", borderRadius: "7px", fontSize: "12px", cursor: "pointer", marginLeft: "auto" }}>Remove</button>
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
