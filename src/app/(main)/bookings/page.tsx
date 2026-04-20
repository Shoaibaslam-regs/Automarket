"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Booking } from "@/models";

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
  confirmedAt?: string;
  renterId: { name: string; email: string; phone?: string };
  rentalId: { _id: string; listingId: ListingInfo; dailyRate: number };
  owner?: OwnerInfo;
};


const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: "#fff8c5", color: "#7d4e00" },
  CONFIRMED: { bg: "#dafbe1", color: "#1a7f37" },
  ACTIVE: { bg: "#ddf4ff", color: "#0550ae" },
  COMPLETED: { bg: "#f6f8fa", color: "#57606a" },
  CANCELLED: { bg: "#fff0f0", color: "#cf222e" },
};

function StatusBanner({ status, tab }: { status: string; tab: string }) {
  if (tab === "received" && status === "PENDING") {
    return (
      <div style={{ background: "#fff8c5", border: "1px solid #e3b341", borderRadius: "7px", padding: "8px 12px", fontSize: "12px", color: "#7d4e00", fontWeight: 500, marginBottom: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
        🔔 New booking request — action required
      </div>
    );
  }
  if (tab === "mine") {
    if (status === "CONFIRMED") return (
      <div style={{ background: "#dafbe1", border: "1px solid #56d364", borderRadius: "7px", padding: "10px 14px", fontSize: "13px", color: "#1a7f37", fontWeight: 500, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "16px" }}>✅</span>
        <div>
          <p style={{ fontWeight: 600, margin: 0 }}>Booking confirmed by owner!</p>
          <p style={{ fontWeight: 400, fontSize: "12px", margin: "2px 0 0", opacity: 0.8 }}>Contact the owner below to arrange pickup.</p>
        </div>
      </div>
    );
    if (status === "PENDING") return (
      <div style={{ background: "#fff8c5", border: "1px solid #e3b341", borderRadius: "7px", padding: "10px 14px", fontSize: "13px", color: "#7d4e00", fontWeight: 500, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "16px" }}>⏳</span>
        <div>
          <p style={{ fontWeight: 600, margin: 0 }}>Waiting for owner confirmation</p>
          <p style={{ fontWeight: 400, fontSize: "12px", margin: "2px 0 0", opacity: 0.8 }}>The owner will confirm or decline shortly.</p>
        </div>
      </div>
    );
    if (status === "CANCELLED") return (
      <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "7px", padding: "10px 14px", fontSize: "13px", color: "#cf222e", fontWeight: 500, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "16px" }}>❌</span>
        <div>
          <p style={{ fontWeight: 600, margin: 0 }}>Booking declined or cancelled</p>
          <p style={{ fontWeight: 400, fontSize: "12px", margin: "2px 0 0", opacity: 0.8 }}>Browse other available vehicles.</p>
        </div>
      </div>
    );
    if (status === "COMPLETED") return (
      <div style={{ background: "#f6f8fa", border: "1px solid #d0d7de", borderRadius: "7px", padding: "10px 14px", fontSize: "13px", color: "#57606a", fontWeight: 500, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "16px" }}>🏁</span>
        <p style={{ fontWeight: 600, margin: 0 }}>Rental completed</p>
      </div>
    );
  }
  return null;
}

export default function BookingsPage() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"mine" | "received">("mine");
  const [updating, setUpdating] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/bookings${tab === "received" ? "?role=owner" : ""}`);
    const data = await res.json();
    setBookings(data.bookings || []);
    setLoading(false);
  }, [tab]);

  const [ownerCount, setOwnerCount] = useState(0);
  const [renterCount, setRenterCount] = useState(0);

  async function fetchPendingCount() {
    try {
      const res = await fetch("/api/bookings/count");
      const data = await res.json();
      setOwnerCount(data.ownerCount || 0);
      setRenterCount(data.renterCount || 0);
      setPendingCount(data.ownerCount || 0);
    } catch {
      setOwnerCount(0);
      setRenterCount(0);
      setPendingCount(0);
    }
  }

  async function markAsSeen() {
    await fetch("/api/bookings/seen", { method: "POST" });
    fetchPendingCount();
  }
  useEffect(() => {
    fetchBookings();
    fetchPendingCount();
  }, [fetchBookings]);
  async function updateStatus(id: string, status: string) {
    setUpdating(id);

    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    // ✅ update locally instead of refetch
    setBookings((prev) =>
      prev.map((b) =>
        b._id === id
          ? {
            ...b,
            status,
            confirmedAt: status === "CONFIRMED" ? new Date().toISOString() : b.confirmedAt,
          }
          : b
      )
    );

    setUpdating(null);
  }

  async function deleteBooking(id: string) {
    setUpdating(id);
    await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    setBookings((prev) => prev.filter((b) => b._id !== id));
    setUpdating(null);
  }
  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>

        {success && (
          <div style={{ background: "#dafbe1", border: "1px solid #56d364", borderRadius: "8px", padding: "14px 18px", fontSize: "14px", color: "#1a7f37", marginBottom: "24px", display: "flex", alignItems: "center", gap: "8px" }}>
            ✅ Booking request sent! The owner will confirm shortly.
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0d1117" }}>Bookings</h1>
          <Link href="/listings?type=RENT" style={{ padding: "8px 16px", background: "#0d1117", color: "white", borderRadius: "8px", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
            Browse rentals
          </Link>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", background: "white", border: "1px solid #e1e4e8", borderRadius: "10px", padding: "4px", marginBottom: "20px", width: "fit-content" }}>

          <button onClick={() => { setTab("mine"); markAsSeen(); }}
            style={{ padding: "7px 16px", borderRadius: "7px", border: "none", fontSize: "13px", fontWeight: 500, cursor: "pointer", background: tab === "mine" ? "#0d1117" : "transparent", color: tab === "mine" ? "white" : "#57606a", display: "flex", alignItems: "center", gap: "6px" }}>
            My bookings
            {renterCount > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "18px", height: "18px", background: tab === "mine" ? "white" : "#cf222e", color: tab === "mine" ? "#cf222e" : "white", fontSize: "11px", fontWeight: 700, borderRadius: "20px", padding: "0 5px" }}>
                {renterCount}
              </span>
            )}
          </button>
          <button onClick={() => setTab("received")}
            style={{ padding: "7px 16px", borderRadius: "7px", border: "none", fontSize: "13px", fontWeight: 500, cursor: "pointer", background: tab === "received" ? "#0d1117" : "transparent", color: tab === "received" ? "white" : "#57606a", display: "flex", alignItems: "center", gap: "6px" }}>
            Received requests
            {ownerCount > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "18px", height: "18px", background: tab === "received" ? "white" : "#cf222e", color: tab === "received" ? "#cf222e" : "white", fontSize: "11px", fontWeight: 700, borderRadius: "20px", padding: "0 5px" }}>
                {ownerCount}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", height: "140px", opacity: 0.4 }} />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "48px", textAlign: "center" }}>
            <p style={{ fontSize: "15px", color: "#0d1117", fontWeight: 500, marginBottom: "8px" }}>No bookings yet</p>
            <p style={{ fontSize: "13px", color: "#57606a", marginBottom: "20px" }}>
              {tab === "mine" ? "Browse available rentals and make your first booking." : "When someone books your vehicle, it will appear here."}
            </p>
            <Link href="/listings?type=RENT" style={{ fontSize: "13px", color: "#0d1117", fontWeight: 600, textDecoration: "underline" }}>
              Browse rentals →
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {bookings.map((booking) => {
              const statusStyle = STATUS_COLORS[booking.status] || STATUS_COLORS.PENDING;
              const days = Math.ceil((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / (1000 * 60 * 60 * 24));
              const listing = booking.rentalId?.listingId as ListingInfo | undefined;
              const listingId = listing?._id;

              return (
                <div key={booking._id} style={{
                  background: "white",
                  border: booking.status === "PENDING" && tab === "received" ? "1px solid #e3b341" : booking.status === "CONFIRMED" && tab === "mine" ? "1px solid #56d364" : "1px solid #e1e4e8",
                  borderRadius: "12px",
                  padding: "20px"
                }}>
                  <StatusBanner status={booking.status} tab={tab} />

                  {/* Listing info row */}
                  {listing && (
                    <div style={{ display: "flex", gap: "12px", marginBottom: "16px", padding: "12px", background: "#f6f8fa", borderRadius: "8px", alignItems: "center" }}>
                      <div style={{ width: "64px", height: "48px", borderRadius: "6px", overflow: "hidden", flexShrink: 0, background: "#e1e4e8" }}>
                        {listing.images?.[0] ? (
                          <img src={listing.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#8c959f" }}>No img</div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {listing.title}
                        </p>
                        <p style={{ fontSize: "12px", color: "#57606a" }}>
                          {listing.make} {listing.model} · {listing.year} · {listing.location}
                        </p>
                      </div>

                      {/* Owner sees contact renter, renter sees view listing */}
                      {tab === "mine" && listingId && (
                        <Link href={`/listings/${listingId}`}
                          style={{ padding: "6px 12px", background: "white", border: "1px solid #d0d7de", borderRadius: "6px", fontSize: "12px", fontWeight: 500, color: "#0d1117", textDecoration: "none", flexShrink: 0 }}>
                          View listing →
                        </Link>
                      )}
                      {tab === "received" && booking.renterId && (
                        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                          {booking.renterId.phone && (
                            <>
                              <a href={`tel:${booking.renterId.phone}`}
                                style={{ padding: "6px 12px", background: "#0d1117", color: "white", borderRadius: "6px", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>
                                📞 Call
                              </a>
                              <a href={`https://wa.me/${booking.renterId.phone.replace(/\D/g, "")}?text=Hi ${booking.renterId.name}, regarding your booking request on AutoMarket`}
                                target="_blank" rel="noreferrer"
                                style={{ padding: "6px 12px", background: "#2da44e", color: "white", borderRadius: "6px", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>
                                💬 WhatsApp
                              </a>
                            </>
                          )}
                          <a href={`mailto:${booking.renterId.email}`}
                            style={{ padding: "6px 12px", background: "white", border: "1px solid #d0d7de", color: "#0d1117", borderRadius: "6px", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>
                            ✉️ Email
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117" }}>
                          {formatDate(booking.startDate)} → {formatDate(booking.endDate)}
                        </span>
                        <span style={{ fontSize: "11px", color: "#57606a" }}>({days} day{days !== 1 ? "s" : ""})</span>
                      </div>

                      {/* Renter details for owner */}
                      {tab === "received" && booking.renterId && (
                        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "4px" }}>
                          <span style={{ fontSize: "12px", color: "#57606a" }}>👤 {booking.renterId.name}</span>
                          <a href={`mailto:${booking.renterId.email}`} style={{ fontSize: "12px", color: "#57606a", textDecoration: "none" }}>
                            ✉️ {booking.renterId.email}
                          </a>
                          {booking.renterId.phone ? (
                            <a href={`tel:${booking.renterId.phone}`} style={{ fontSize: "12px", color: "#0d1117", fontWeight: 600, textDecoration: "none" }}>
                              📞 {booking.renterId.phone}
                            </a>
                          ) : (
                            <span style={{ fontSize: "12px", color: "#8c959f" }}>📞 No phone added</span>
                          )}
                          <span style={{ fontSize: "9px", color: "#57606a" }}>
                            🕒 {new Date(booking.createdAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {/* Owner contact for confirmed renter */}
                      {tab === "mine" && booking.status === "CONFIRMED" && booking.owner && (
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "8px", padding: "10px 12px", background: "#dafbe1", borderRadius: "7px", border: "1px solid #56d364" }}>
                          <span style={{ fontSize: "12px", color: "#1a7f37", fontWeight: 600 }}>Owner:</span>
                          {booking.owner.name && <span style={{ fontSize: "12px", color: "#1a7f37" }}>👤 {booking.owner.name}</span>}
                          {booking.owner.phone && (
                            <a href={`tel:${booking.owner.phone}`} style={{ fontSize: "12px", color: "#1a7f37", fontWeight: 600, textDecoration: "none" }}>
                              📞 {booking.owner.phone}
                            </a>
                          )}
                          {booking.owner.phone && (
                            <a href={`https://wa.me/${booking.owner.phone.replace(/\D/g, "")}?text=Hi, my booking was confirmed on AutoMarket`}
                              target="_blank" rel="noreferrer"
                              style={{ fontSize: "12px", color: "#1a7f37", fontWeight: 600, textDecoration: "none" }}>
                              💬 WhatsApp
                            </a>
                          )}
                          {booking.owner.email && (
                            <a href={`mailto:${booking.owner.email}`} style={{ fontSize: "12px", color: "#1a7f37", textDecoration: "none" }}>
                              ✉️ {booking.owner.email}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "20px", background: statusStyle.bg, color: statusStyle.color, flexShrink: 0, marginLeft: "12px" }}>
                      {booking.status}
                    </span>
                  </div>

                  {/* Price breakdown */}
                  <div style={{ display: "flex", gap: "20px", marginBottom: "14px", padding: "12px 16px", background: "#f6f8fa", borderRadius: "8px" }}>
                    <div>
                      <p style={{ fontSize: "11px", color: "#8c959f", marginBottom: "2px" }}>Rental amount</p>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "#0d1117" }}>PKR {booking.totalAmount.toLocaleString()}</p>
                    </div>
                    <div style={{ width: "1px", background: "#e1e4e8" }} />
                    <div>
                      <p style={{ fontSize: "11px", color: "#8c959f", marginBottom: "2px" }}>Deposit</p>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "#0d1117" }}>PKR {booking.deposit.toLocaleString()}</p>
                    </div>
                    <div style={{ width: "1px", background: "#e1e4e8" }} />
                    <div>
                      <p style={{ fontSize: "11px", color: "#8c959f", marginBottom: "2px" }}>Total</p>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "#0d1117" }}>PKR {(booking.totalAmount + booking.deposit).toLocaleString()}</p>
                    </div>
                  </div>


                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: "8px" }}>

                    {["COMPLETED", "CANCELLED"].includes(booking.status) && (
                      <button
                        onClick={() => deleteBooking(booking._id)}
                        disabled={updating === booking._id}
                        style={{ padding: "8px 14px", background: "white", color: "#8c959f", border: "1px solid #e1e4e8", borderRadius: "7px", fontSize: "12px", cursor: "pointer", marginLeft: "auto" }}
                      >
                        🗑 Remove
                      </button>

                    )}
                    {tab === "received" && booking.status === "PENDING" && (
                      <>
                        <button onClick={() => updateStatus(booking._id, "CONFIRMED")} disabled={updating === booking._id}
                          style={{ padding: "8px 18px", background: "#2da44e", color: "white", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: "pointer", opacity: updating === booking._id ? 0.6 : 1 }}>
                          {updating === booking._id ? "..." : "✓ Confirm"}
                        </button>
                        <button onClick={() => updateStatus(booking._id, "CANCELLED")} disabled={updating === booking._id}
                          style={{ padding: "8px 18px", background: "white", color: "#cf222e", border: "1px solid #ffcdd2", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                          ✕ Decline
                        </button>
                      </>
                    )}
                    {tab === "received" && booking.status === "CONFIRMED" && (
                      <button onClick={() => updateStatus(booking._id, "COMPLETED")} disabled={updating === booking._id}
                        style={{ padding: "8px 18px", background: "#0d1117", color: "white", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                        Mark as completed
                      </button>
                    )}
                    {tab === "mine" && ["PENDING", "CONFIRMED"].includes(booking.status) && (
                      <button onClick={() => updateStatus(booking._id, "CANCELLED")} disabled={updating === booking._id}
                        style={{ padding: "8px 18px", background: "white", color: "#cf222e", border: "1px solid #ffcdd2", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
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
