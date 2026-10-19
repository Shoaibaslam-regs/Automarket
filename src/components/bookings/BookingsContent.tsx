"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Car, Clock3, FileText, IdCard, Mail, MapPin, MessageCircle, MoreHorizontal, Pencil, Phone, Trash2, TriangleAlert, Undo2, UserRound, Wallet, X } from "lucide-react";
import { refreshNotificationCounts } from "@/hooks/useNotificationCounts";
import AvailabilityControl from "@/components/listings/AvailabilityControl";
import HandoverDialog, { PlateBadge } from "@/components/bookings/HandoverDialog";
import { DepositTag } from "@/components/bookings/DepositDialog";
import { LATE_RULE_TEXT, rentalDays } from "@/lib/bookings";
import { PAYMENT_LABEL, paymentState, type PaymentStatus } from "@/lib/payments";
import { PaymentDialog, PaymentTag } from "@/components/bookings/PaymentTag";
import { mapsUrl } from "@/lib/address";
import StatusText from "@/components/ui/StatusText";

type ListingInfo = {
  _id: string;
  title: string;
  images: string[];
  make: string;
  model: string;
  year: number;
  location: string;
  address?: string;
  type?: string;
  status?: string;
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
  plateNumber?: string;
  renterCnic?: string;
  /** Exact return time the owner set at handover; late fee charged at "Mark returned" */
  dueBackAt?: string;
  returnedAt?: string;
  lateDays?: number;
  lateFee?: number;
  extraCharges?: number;
  extraChargesNote?: string;
  depositRefunded?: number;
  depositNote?: string;
  depositSettledAt?: string | null;
  /** What the renter has paid so far, recorded by the owner; drives the payment tag */
  amountPaid?: number;
  renterId: { name: string; email: string; phone?: string };
  rentalId: { _id: string; listingId: ListingInfo; dailyRate: number; plateNumber?: string };
  /** Deal bookings have a deal instead of a listed vehicle */
  dealId?: { _id: string; title: string; images: string[]; make: string; model: string; year: number; location: string; address?: string; vehicleCount?: number } | null;
  owner?: OwnerInfo;
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING:   { bg: "var(--gh-fff8c5)", color: "var(--gh-7d4e00)" },
  CONFIRMED: { bg: "var(--gh-dafbe1)", color: "var(--gh-1a7f37)" },
  ACTIVE:    { bg: "var(--gh-ddf4ff)", color: "var(--gh-0550ae)" },
  COMPLETED: { bg: "var(--gh-f6f8fa)", color: "var(--gh-57606a)" },
  CANCELLED: { bg: "var(--gh-fff0f0)", color: "var(--gh-cf222e)" },
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

function fmtTime(d: string) {
  return new Date(d).toLocaleString("en-PK", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** What was booked, as listing-shaped info: the deal for deal bookings, otherwise the listed vehicle. */
function bookedItem(booking: Booking): ListingInfo | undefined {
  if (booking.rentalId?.listingId) return booking.rentalId.listingId;
  const d = booking.dealId;
  return d ? { _id: d._id, title: d.title, images: d.images, make: d.make, model: d.model, year: d.year, location: d.location, address: d.address } : undefined;
}

/** The slip is written as raw HTML, so text typed by users is escaped first. */
const escapeHtml = (v: string) => v.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function generateSlip(booking: Booking, tab: string) {
  const listing = bookedItem(booking);
  const days = rentalDays(booking.startDate, booking.endDate);
  // The slip opens in its own window without the theme variables, so use the plain light-theme colours
  const plain = (v: string) => v.replace(/var\(--gh-([0-9a-f]{6})\)/g, "#$1");
  const themed = STATUS_COLORS[booking.status] || STATUS_COLORS.PENDING;
  const statusStyle = { bg: plain(themed.bg), color: plain(themed.color) };
  const html = `<!DOCTYPE html><html><head><title>Booking Slip — AutoMarket</title>
  <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:40px auto;color:#0d1117;padding:0 20px}.header{text-align:center;border-bottom:2px solid #0d1117;padding-bottom:20px;margin-bottom:24px}.logo{font-size:24px;font-weight:800}.section{margin-bottom:20px}.section-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#57606a;margin-bottom:10px;border-bottom:1px solid #e1e4e8;padding-bottom:6px}.row{display:flex;justify-content:space-between;font-size:13px;padding:5px 0}.label{color:#57606a}.value{font-weight:600}.total-row{display:flex;justify-content:space-between;font-size:15px;font-weight:700;padding:12px 0;border-top:2px solid #0d1117;margin-top:8px}.status-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;background:${statusStyle.bg};color:${statusStyle.color}}.footer{text-align:center;font-size:11px;color:#8c959f;margin-top:32px;border-top:1px solid #e1e4e8;padding-top:16px}</style>
  </head><body>
  <div class="header"><div class="logo">AutoMarket</div><div style="font-size:14px;color:#57606a;margin-top:4px">${booking.dealId ? "Deal Booking Slip" : "Rental Booking Slip"}</div><div style="font-size:11px;color:#8c959f;margin-top:4px">Booking ID: ${booking._id}</div></div>
  <div class="section"><div class="section-title">Vehicle details</div>
  <div class="row"><span class="label">Vehicle</span><span class="value">${escapeHtml(listing?.title || "N/A")}</span></div>
  ${booking.plateNumber ? `<div class="row"><span class="label">Number plate</span><span class="value" style="border:2px solid #0d1117;border-radius:4px;padding:0 6px;font-family:monospace;letter-spacing:2px">${booking.plateNumber}</span></div>` : ""}
  <div class="row"><span class="label">Make & model</span><span class="value">${escapeHtml(`${listing?.make ?? ""} ${listing?.model ?? ""} ${listing?.year ?? ""}`)}</span></div>
  <div class="row"><span class="label">Location</span><span class="value">${escapeHtml(listing?.location || "N/A")}</span></div>
  ${listing?.address ? `<div class="row"><span class="label">Pickup address</span><span class="value" style="text-align:right;max-width:60%">${escapeHtml(listing.address)}</span></div>` : ""}</div>
  <div class="section"><div class="section-title">Booking details</div>
  <div class="row"><span class="label">Pick-up</span><span class="value">${fmt(booking.startDate)}</span></div>
  <div class="row"><span class="label">Return</span><span class="value">${fmt(booking.endDate)}</span></div>
  <div class="row"><span class="label">Duration</span><span class="value">${days} day${days !== 1 ? "s" : ""}</span></div>
  <div class="row"><span class="label">Status</span><span><span class="status-badge">${booking.status}</span></span></div>
  <div class="row"><span class="label">Requested on</span><span class="value">${fmtTime(booking.createdAt)}</span></div>
  ${booking.confirmedAt ? `<div class="row"><span class="label">Confirmed on</span><span class="value">${fmtTime(booking.confirmedAt)}</span></div>` : ""}
  ${booking.cancelledAt ? `<div class="row"><span class="label">Cancelled on</span><span class="value">${fmtTime(booking.cancelledAt)}</span></div>` : ""}
  ${booking.dueBackAt ? `<div class="row"><span class="label">Return by</span><span class="value">${fmtTime(booking.dueBackAt)}</span></div>` : ""}
  ${booking.returnedAt ? `<div class="row"><span class="label">Returned</span><span class="value">${fmtTime(booking.returnedAt)}</span></div>` : ""}
  ${tab === "mine" && booking.renterCnic ? `<div class="row"><span class="label">Your CNIC</span><span class="value" style="font-family:monospace;letter-spacing:1px">${booking.renterCnic}</span></div>` : ""}
  </div>
  ${tab === "received" ? `<div class="section"><div class="section-title">Renter details</div>
  <div class="row"><span class="label">Name</span><span class="value">${escapeHtml(booking.renterId?.name || "N/A")}</span></div>
  <div class="row"><span class="label">Email</span><span class="value">${escapeHtml(booking.renterId?.email || "N/A")}</span></div>
  ${booking.renterId?.phone ? `<div class="row"><span class="label">Phone</span><span class="value">${escapeHtml(booking.renterId.phone)}</span></div>` : ""}
  ${booking.renterCnic ? `<div class="row"><span class="label">CNIC</span><span class="value" style="font-family:monospace;letter-spacing:1px">${booking.renterCnic}</span></div>` : ""}
  </div>` : `<div class="section"><div class="section-title">Owner details</div>
  <div class="row"><span class="label">Name</span><span class="value">${escapeHtml(booking.owner?.name || "N/A")}</span></div>
  <div class="row"><span class="label">Email</span><span class="value">${escapeHtml(booking.owner?.email || "N/A")}</span></div>
  ${booking.owner?.phone ? `<div class="row"><span class="label">Phone</span><span class="value">${escapeHtml(booking.owner.phone)}</span></div>` : ""}
  </div>`}
  <div class="section"><div class="section-title">Payment summary</div>
  <div class="row"><span class="label">Rental × ${days} days</span><span class="value">PKR ${booking.totalAmount.toLocaleString()}</span></div>
  <div class="row"><span class="label">Security deposit</span><span class="value">PKR ${booking.deposit.toLocaleString()}</span></div>
  ${booking.lateFee ? `<div class="row"><span class="label">Late return × ${booking.lateDays} day${booking.lateDays !== 1 ? "s" : ""}</span><span class="value">PKR ${booking.lateFee.toLocaleString()}</span></div>` : ""}
  ${booking.extraCharges ? `<div class="row"><span class="label">Extra charges${booking.extraChargesNote ? ` (${escapeHtml(booking.extraChargesNote)})` : ""}</span><span class="value">PKR ${booking.extraCharges.toLocaleString()}</span></div>` : ""}
  <div class="total-row"><span>Total payable</span><span>PKR ${(booking.totalAmount + booking.deposit + (booking.lateFee ?? 0) + (booking.extraCharges ?? 0)).toLocaleString()}</span></div>
  ${(() => { const p = paymentState(booking); return `<div class="row"><span class="label">Payment</span><span class="value">${PAYMENT_LABEL[p.status]}</span></div>${p.paid > 0 ? `<div class="row"><span class="label">Paid so far</span><span class="value">PKR ${p.paid.toLocaleString()}</span></div>` : ""}${p.balance > 0 ? `<div class="row"><span class="label">Balance due</span><span class="value">PKR ${p.balance.toLocaleString()}</span></div>` : ""}`; })()}
  ${booking.dueBackAt && !booking.returnedAt ? `<p style="margin-top:10px;font-size:12px;color:#7d4e00">${LATE_RULE_TEXT}</p>` : ""}</div>
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
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--gh-ffffff)", borderRadius: "12px", width: "100%", maxWidth: "400px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
        <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ color: "var(--gh-cf222e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{icon}</div>
          <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gh-8c959f)", fontSize: "20px" }}>×</button>
        </div>
        <div style={{ padding: "16px 24px 24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--gh-0d1117)", marginBottom: "8px" }}>{title}</h3>
          <p style={{ fontSize: "14px", color: "var(--gh-57606a)", lineHeight: 1.6, marginBottom: error ? "12px" : "24px" }}>{message}</p>
          {error && <div role="alert" style={{ background: "var(--gh-fff0f0)", border: "1px solid var(--gh-ffcdd2)", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "var(--gh-cf222e)", marginBottom: "16px" }}>{error}</div>}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button onClick={onCancel} disabled={loading} style={{ padding: "8px 18px", background: "var(--gh-f6f8fa)", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", fontSize: "14px", fontWeight: 500, color: "var(--gh-0d1117)", cursor: "pointer" }}>{cancelLabel}</button>
            <button onClick={onConfirm} disabled={loading} style={{ padding: "8px 18px", background: "var(--gh-cf222e)", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, color: "var(--gh-ffffff)", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? loadingLabel : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Status pill, border and one-line hint for a booking card, worded for the renter ("mine") or the owner ("received"). */
function cardLook(status: string, received: boolean): { label: string; hint?: string; bg: string; color: string; border: string } {
  const plain = "border-[var(--gh-e1e4e8)]";
  switch (status) {
    case "PENDING":
      return received
        ? { label: "New request", hint: "New booking request — action required", bg: "var(--gh-fff8c5)", color: "var(--gh-7d4e00)", border: "border-[var(--gh-e3b341)]" }
        : { label: "Waiting", hint: "Waiting for the owner to confirm", bg: "var(--gh-fff8c5)", color: "var(--gh-7d4e00)", border: plain };
    case "CONFIRMED":
      return received
        ? { label: "Confirmed", bg: "var(--gh-dafbe1)", color: "var(--gh-1a7f37)", border: plain }
        : { label: "Confirmed", hint: "Booking confirmed! Contact the owner to arrange pickup.", bg: "var(--gh-dafbe1)", color: "var(--gh-1a7f37)", border: "border-[var(--gh-56d364)]" };
    case "ACTIVE":
      return { label: "Out now", bg: "var(--gh-ddf4ff)", color: "var(--gh-0550ae)", border: plain };
    case "COMPLETED":
      return { label: "Completed", bg: "var(--gh-f6f8fa)", color: "var(--gh-57606a)", border: plain };
    case "CANCELLED":
      return { label: received ? "Cancelled" : "Declined / cancelled", bg: "var(--gh-fff0f0)", color: "var(--gh-cf222e)", border: plain };
    default:
      return { label: status, bg: "var(--gh-f6f8fa)", color: "var(--gh-57606a)", border: plain };
  }
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
  // The owner records the number plate and renter's CNIC when handing the vehicle over
  const [plateFor, setPlateFor] = useState<Booking | null>(null);

  async function saveHandover(details: { plateNumber: string; cnic: string }): Promise<string | null> {
    if (!plateFor) return null;
    const res = await fetch(`/api/bookings/${plateFor._id}/handover`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(details) });
    if (!res.ok) return (await res.json().catch(() => ({}))).error || "Couldn't save the handover details";
    const id = plateFor._id;
    setBookings(prev => prev.map(b => (b._id === id ? { ...b, plateNumber: details.plateNumber, renterCnic: details.cnic } : b)));
    setPlateFor(null);
    return null;
  }

  // The owner records what the renter has paid (pending, partly paid or paid)
  const [payFor, setPayFor] = useState<Booking | null>(null);
  // Booking whose "More" tray is open
  const [openMore, setOpenMore] = useState<string | null>(null);

  async function savePayment(body: { status: PaymentStatus; amountPaid?: number }): Promise<string | null> {
    if (!payFor) return null;
    const res = await fetch(`/api/bookings/${payFor._id}/payment`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return data.error || "Couldn't save the payment";
    const id = payFor._id;
    setBookings(prev => prev.map(b => (b._id === id ? { ...b, amountPaid: data.amountPaid } : b)));
    setPayFor(null);
    return null;
  }

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

        <HandoverDialog
          open={plateFor !== null}
          onOpenChange={o => !o && setPlateFor(null)}
          title="Handover details"
          description={`Record the number plate of the ${plateFor?.rentalId?.listingId?.title ?? "vehicle"} and the renter's CNIC. Both show on the booking and the slip.`}
          confirmLabel="Save details"
          initialPlate={plateFor ? plateFor.plateNumber ?? plateFor.rentalId?.plateNumber : undefined}
          initialCnic={plateFor?.renterCnic}
          onSave={saveHandover}
        />
        <PaymentDialog
          open={payFor !== null}
          onOpenChange={o => !o && setPayFor(null)}
          booking={payFor}
          customer={payFor?.renterId?.name}
          onSave={savePayment}
        />
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
          <div style={{ background: "var(--gh-dafbe1)", border: "1px solid var(--gh-56d364)", borderRadius: "8px", padding: "14px 18px", fontSize: "14px", color: "var(--gh-1a7f37)", marginBottom: "24px" }}>
            Booking request sent! The owner will confirm shortly.
          </div>
        )}

        <div className="adm-header">
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--gh-0d1117)" }}>Bookings</h1>
          <Link href="/listings?type=RENT" style={{ padding: "8px 16px", background: "var(--gh-0d1117)", color: "var(--gh-ffffff)", borderRadius: "8px", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
            Browse rentals
          </Link>
        </div>

        <div className="adm-tabs">
          <button onClick={() => { setTab("mine"); markAsSeen(); }}
            style={{ padding: "7px 16px", borderRadius: "7px", border: "none", fontSize: "13px", fontWeight: 500, cursor: "pointer", background: tab === "mine" ? "var(--gh-0d1117)" : "transparent", color: tab === "mine" ? "var(--gh-ffffff)" : "var(--gh-57606a)", display: "flex", alignItems: "center", gap: "6px" }}>
            My bookings
            {renterCount > 0 && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "18px", height: "18px", background: tab === "mine" ? "var(--gh-ffffff)" : "var(--gh-cf222e)", color: tab === "mine" ? "var(--gh-cf222e)" : "var(--gh-ffffff)", fontSize: "11px", fontWeight: 700, borderRadius: "20px", padding: "0 5px" }}>{renterCount}</span>}
          </button>
          <button onClick={() => setTab("received")}
            style={{ padding: "7px 16px", borderRadius: "7px", border: "none", fontSize: "13px", fontWeight: 500, cursor: "pointer", background: tab === "received" ? "var(--gh-0d1117)" : "transparent", color: tab === "received" ? "var(--gh-ffffff)" : "var(--gh-57606a)", display: "flex", alignItems: "center", gap: "6px" }}>
            Received requests
            {ownerCount > 0 && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "18px", height: "18px", background: tab === "received" ? "var(--gh-ffffff)" : "var(--gh-cf222e)", color: tab === "received" ? "var(--gh-cf222e)" : "var(--gh-ffffff)", fontSize: "11px", fontWeight: 700, borderRadius: "20px", padding: "0 5px" }}>{ownerCount}</span>}
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[1,2,3].map(i => <div key={i} style={{ background: "var(--gh-ffffff)", border: "1px solid var(--gh-e1e4e8)", borderRadius: "12px", height: "140px", opacity: 0.4 }} />)}
          </div>
        ) : bookings.length === 0 ? (
          <div style={{ background: "var(--gh-ffffff)", border: "1px solid var(--gh-e1e4e8)", borderRadius: "12px", padding: "48px", textAlign: "center" }}>
            <p style={{ fontSize: "15px", color: "var(--gh-0d1117)", fontWeight: 500, marginBottom: "8px" }}>No bookings yet</p>
            <p style={{ fontSize: "13px", color: "var(--gh-57606a)", marginBottom: "20px" }}>{tab === "mine" ? "Browse available rentals and make your first booking." : "When someone books your vehicle, it will appear here."}</p>
            {tab === "mine"
              ? <Link href="/listings?type=RENT" className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--gh-0d1117)] px-4 py-2.5 text-[13px] font-semibold text-white">Browse cars for rent</Link>
              : <Link href="/sell" className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--gh-0d1117)] px-4 py-2.5 text-[13px] font-semibold text-white">List a vehicle for rent</Link>}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {bookings.map(booking => {
              const days = rentalDays(booking.startDate, booking.endDate);
              const listing = bookedItem(booking);
              const listingId = listing?._id;
              const isDeal = !!booking.dealId;
              const received = tab === "received";
              const look = cardLook(booking.status, received);
              const busy = updating === booking._id;
              const moreOpen = openMore === booking._id;
              // Who to contact: the renter for the owner, and the owner once the renter's booking is confirmed
              const person =
                received && booking.renterId ? { role: "Renter", name: booking.renterId.name, phone: booking.renterId.phone, email: booking.renterId.email }
                : !received && booking.owner && ["CONFIRMED", "ACTIVE", "COMPLETED"].includes(booking.status) ? { role: "Owner", name: booking.owner.name, phone: booking.owner.phone, email: booking.owner.email }
                : null;
              const primary =
                received && booking.status === "PENDING" ? { label: busy ? "Confirming…" : "Confirm", onClick: () => updateStatus(booking._id, "CONFIRMED"), cls: "bg-[var(--gh-2da44e)] hover:bg-[var(--gh-2c974b)]" }
                : received && booking.status === "CONFIRMED" ? { label: "Mark as completed", onClick: () => updateStatus(booking._id, "COMPLETED"), cls: "bg-[var(--gh-0d1117)] hover:bg-[var(--gh-24292f)]" }
                : null;
              const canSlip = ["CONFIRMED", "COMPLETED"].includes(booking.status);
              const canRemove = ["COMPLETED", "CANCELLED"].includes(booking.status) || !booking.rentalId;
              const canCancel = ["PENDING", "CONFIRMED"].includes(booking.status);
              const hasHandover = !!(booking.plateNumber || booking.renterCnic);
              const iconBtn = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-2.5 text-xs font-semibold transition hover:bg-[var(--gh-f6f8fa)] disabled:opacity-50";
              const trayBtn = "inline-flex items-center gap-1.5 rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--gh-0d1117)] transition hover:bg-[var(--gh-f6f8fa)] disabled:opacity-50";
              const total = booking.totalAmount + booking.deposit + (booking.lateFee ?? 0) + (booking.extraCharges ?? 0);
              return (
                <div key={booking._id} className={`overflow-hidden rounded-2xl border bg-white ${look.border}`}>
                  <div className="p-3.5 sm:p-4">
                    {/* Vehicle */}
                    <div className="flex gap-3">
                      <div className="relative h-14 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-[var(--gh-f6f8fa)] sm:h-16 sm:w-20">
                        {listing?.images?.[0]
                          ? <Image src={listing.images[0]} alt="" fill sizes="80px" className="object-cover" />
                          : <div className="flex h-full items-center justify-center text-[var(--gh-8c959f)]"><Car size={18} strokeWidth={1.5} /></div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          {listingId ? (
                            <Link href={isDeal ? `/deals/${listingId}` : `/listings/${listingId}`} className="min-w-0 truncate text-[15px] font-bold leading-tight text-[var(--gh-0d1117)] hover:underline">
                              {listing?.title}
                            </Link>
                          ) : (
                            <p className="min-w-0 truncate text-[15px] font-bold leading-tight text-[var(--gh-0d1117)]">{listing?.title ?? "Vehicle removed"}</p>
                          )}
                          <StatusText color={look.color}>{look.label}</StatusText>
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-[var(--gh-57606a)]">
                          {isDeal && (
                            <span className="theme-static inline-flex items-center rounded-full bg-gradient-to-r from-rose-600 to-orange-500 px-1.5 py-px text-[9px] font-extrabold tracking-wide text-white">
                              DEAL{(booking.dealId?.vehicleCount ?? 1) > 1 ? ` · ${booking.dealId!.vehicleCount} CARS` : ""}
                            </span>
                          )}
                          {listing && <span className="truncate">{listing.make} {listing.model} · {listing.year} · {listing.location}</span>}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-[var(--gh-0d1117)]">
                          <CalendarDays size={12} className="flex-shrink-0 text-[var(--gh-8c959f)]" />
                          {fmt(booking.startDate)} → {fmt(booking.endDate)} <span className="text-[var(--gh-8c959f)]">· {days} day{days !== 1 ? "s" : ""}</span>
                        </p>
                      </div>
                    </div>

                    {/* People, pickup, return, handover */}
                    <div className="mt-3 space-y-1.5 text-xs">
                      {look.hint && <p className="font-medium" style={{ color: look.color }}>{look.hint}</p>}
                      {person && (
                        <p className="flex min-w-0 items-center gap-1.5 text-[var(--gh-57606a)]">
                          <UserRound size={12} className="flex-shrink-0 text-[var(--gh-8c959f)]" />
                          <span className="truncate">{person.role}: {person.name || "—"}</span>
                          {person.phone
                            ? <a href={`tel:${person.phone}`} className="flex flex-shrink-0 items-center gap-1 font-semibold text-[var(--gh-0d1117)]"><Phone size={11} /> {person.phone}</a>
                            : received && <span className="text-[var(--gh-8c959f)]">· No phone added</span>}
                        </p>
                      )}
                      {listing?.address && booking.status !== "CANCELLED" && (
                        <a href={mapsUrl(listing.address, listing.location)} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-1.5 text-[var(--gh-0550ae)]">
                          <MapPin size={12} className="flex-shrink-0" /> <span className="truncate">Pickup: {listing.address}</span>
                        </a>
                      )}
                      {booking.returnedAt ? (
                        <p className="flex items-center gap-1.5 text-[var(--gh-57606a)]"><Undo2 size={12} className="text-[var(--gh-8c959f)]" /> Returned {fmtTime(booking.returnedAt)}</p>
                      ) : booking.dueBackAt && (
                        <p className="flex items-center gap-1.5 font-semibold text-[var(--gh-0550ae)]"><Clock3 size={12} /> Return by {fmtTime(booking.dueBackAt)}</p>
                      )}
                      {booking.status === "ACTIVE" && booking.dueBackAt && <p className="text-[11px] text-[var(--gh-7d4e00)]">{LATE_RULE_TEXT}</p>}
                      {hasHandover && (
                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          {booking.plateNumber && <PlateBadge plate={booking.plateNumber} className="!px-1.5 !py-0 text-[10px]" />}
                          {booking.renterCnic && <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[var(--gh-0d1117)]"><IdCard size={12} className="text-[var(--gh-8c959f)]" /> {booking.renterCnic}</span>}
                        </p>
                      )}
                    </div>

                    {/* Money */}
                    <div className="mt-3">
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <p className="whitespace-nowrap text-base font-extrabold leading-tight tabular-nums text-[var(--gh-0d1117)]">PKR {total.toLocaleString()}</p>
                        {booking.status !== "CANCELLED" && <PaymentTag booking={booking} onClick={received ? () => setPayFor(booking) : undefined} />}
                      </div>
                      <p className="mt-0.5 text-[11px] leading-snug text-[var(--gh-8c959f)]">
                        Rent PKR {booking.totalAmount.toLocaleString()} · Deposit PKR {booking.deposit.toLocaleString()}
                        {(booking.lateFee ?? 0) > 0 && <span className="text-[var(--gh-cf222e)]"> · Late PKR {booking.lateFee!.toLocaleString()} ({booking.lateDays} extra day{booking.lateDays !== 1 ? "s" : ""})</span>}
                        {(booking.extraCharges ?? 0) > 0 && <span className="text-[var(--gh-cf222e)]"> · Extra PKR {booking.extraCharges!.toLocaleString()}{booking.extraChargesNote ? ` (${booking.extraChargesNote})` : ""}</span>}
                      </p>
                      {booking.depositSettledAt && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <DepositTag booking={booking} />
                          {booking.depositNote && (booking.depositRefunded ?? 0) < booking.deposit && <span className="text-[11px] text-[var(--gh-8c959f)]">{booking.depositNote}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 border-t border-[var(--gh-e1e4e8)] px-3.5 py-2.5 sm:px-4">
                    {primary && (
                      <button onClick={primary.onClick} disabled={busy} className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold text-white transition disabled:opacity-50 sm:flex-none ${primary.cls}`}>
                        {primary.label}
                      </button>
                    )}
                    <div className={`flex items-center gap-1.5 ${primary ? "" : "flex-1"}`}>
                      {canSlip && (
                        <button onClick={() => generateSlip(booking, tab)} aria-label="Booking slip" className={`${iconBtn} text-[var(--gh-0d1117)]`}>
                          <FileText size={14} /> <span className={primary ? "hidden sm:inline" : ""}>Slip</span>
                        </button>
                      )}
                      {person?.phone && (
                        <a href={`https://wa.me/${person.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${person.name ?? ""}`)}`} target="_blank" rel="noreferrer" aria-label={`WhatsApp the ${person.role.toLowerCase()}`} className={`${iconBtn} text-[var(--gh-1a7f37)]`}>
                          <MessageCircle size={14} /> <span className={primary ? "hidden sm:inline" : ""}>WhatsApp</span>
                        </a>
                      )}
                    </div>
                    <button type="button" onClick={() => setOpenMore(moreOpen ? null : booking._id)} aria-expanded={moreOpen} aria-label="More actions"
                      className={`${iconBtn} ml-auto ${moreOpen ? "bg-[var(--gh-f6f8fa)] text-[var(--gh-0d1117)]" : "text-[var(--gh-57606a)]"}`}>
                      <MoreHorizontal size={15} /> <span className="hidden sm:inline">More</span>
                    </button>
                  </div>

                  {/* Less frequent actions and details */}
                  {moreOpen && (
                    <div className="space-y-3 border-t border-[var(--gh-e1e4e8)] bg-[var(--gh-fafbfc)] px-3.5 py-3 sm:px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {received && booking.status !== "CANCELLED" && (
                          <button onClick={() => setPayFor(booking)} className={trayBtn}><Wallet size={13} /> Update payment</button>
                        )}
                        {received && booking.status !== "CANCELLED" && (hasHandover || ["CONFIRMED", "COMPLETED"].includes(booking.status)) && (
                          <button onClick={() => setPlateFor(booking)} className={trayBtn}><Pencil size={13} /> {hasHandover ? "Edit plate & CNIC" : "Add plate & CNIC"}</button>
                        )}
                        {person?.email && (
                          <a href={`mailto:${person.email}`} className={trayBtn}><Mail size={13} /> Email {person.role.toLowerCase()}</a>
                        )}
                        {canCancel && (
                          <button onClick={() => setCancelTarget({ id: booking._id, action: received && booking.status === "PENDING" ? "decline" : "cancel" })} disabled={busy}
                            className={`${trayBtn} border-[var(--gh-ffcdd2)] !text-[var(--gh-cf222e)] hover:bg-[var(--gh-fff0f0)]`}>
                            <X size={13} /> {received && booking.status === "PENDING" ? "Decline request" : "Cancel booking"}
                          </button>
                        )}
                        {canRemove && (
                          <button onClick={() => setDeleteTarget(booking._id)} className={`${trayBtn} !text-[var(--gh-57606a)] hover:border-[var(--gh-ffcdd2)] hover:!text-[var(--gh-cf222e)]`}>
                            <Trash2 size={13} /> Remove from list
                          </button>
                        )}
                      </div>
                      {received && listing?._id && listing.type && listing.status && booking.status !== "CANCELLED" && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold text-[var(--gh-57606a)]">Vehicle tag</span>
                          <AvailabilityControl
                            key={`${listing._id}-${listing.status}`}
                            id={listing._id}
                            type={listing.type}
                            status={listing.status}
                            allow={["ACTIVE", "RENTED"]}
                            onChanged={st => setBookings(prev => prev.map(x => (x.rentalId?.listingId?._id === listing._id ? { ...x, rentalId: { ...x.rentalId, listingId: { ...x.rentalId.listingId, status: st } } } : x)))}
                          />
                        </div>
                      )}
                      <p className="text-[11px] leading-relaxed text-[var(--gh-8c959f)]">
                        Requested {fmtTime(booking.createdAt)}
                        {booking.confirmedAt && <> · Confirmed {fmtTime(booking.confirmedAt)}</>}
                        {booking.cancelledAt && <> · Cancelled {fmtTime(booking.cancelledAt)}</>}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
