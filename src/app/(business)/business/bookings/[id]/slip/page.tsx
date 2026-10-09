"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { bookingNumber, rentalDays, type BookingStatus } from "@/lib/bookings";

type SlipData = {
  booking: {
    _id: string;
    startDate: string;
    endDate: string;
    totalAmount: number;
    deposit: number;
    status: BookingStatus;
    source?: "ONLINE" | "WALK_IN";
    walkIn?: { name: string; phone: string; email?: string; cnic?: string };
    renterId?: { name?: string; email: string; phone?: string } | null;
    createdBy?: { name?: string } | null;
    notes?: string;
    createdAt: string;
    confirmedAt?: string;
    startedAt?: string;
    completedAt?: string;
    rentalId?: {
      dailyRate: number;
      listingId?: { title: string; make: string; model: string; year: number; color?: string; fuelType?: string; transmission?: string; location?: string } | null;
    } | null;
  };
  organization: { name: string; phone?: string; email?: string; address?: string; city?: string; type?: string } | null;
};

const STATUS_LABEL: Record<BookingStatus, { text: string; color: string; bg: string }> = {
  PENDING: { text: "PENDING", color: "#7d4e00", bg: "#fff8c5" },
  CONFIRMED: { text: "CONFIRMED", color: "#0550ae", bg: "#ddf4ff" },
  ACTIVE: { text: "VEHICLE OUT", color: "#1a7f37", bg: "#dafbe1" },
  COMPLETED: { text: "COMPLETED", color: "#57606a", bg: "#f6f8fa" },
  CANCELLED: { text: "CANCELLED", color: "#cf222e", bg: "#fff0f0" },
};

const date = (d?: string) => (d ? new Date(d).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—");
const dateTime = (d?: string) => (d ? new Date(d).toLocaleString("en-PK", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
const pkr = (n: number) => `PKR ${n.toLocaleString()}`;

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 text-[13px]">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

/** Printable booking slip for the business and the customer. Print or "Save as PDF" from the browser. */
export default function BookingSlipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<SlipData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/business/bookings/${id}`)
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Booking not found");
        setData(d);
      })
      .catch(e => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fa] p-6">
        <div className="rounded-2xl border border-[#ffcdd2] bg-white p-8 text-center">
          <p className="text-sm font-semibold text-[#cf222e]">{error}</p>
          <Link href="/business/bookings" className="mt-3 inline-block text-[13px] font-semibold text-[#0d1117] underline">Back to bookings</Link>
        </div>
      </div>
    );
  }
  if (!data) return <div className="min-h-screen animate-pulse bg-[#f6f8fa]" />;

  const { booking: b, organization: org } = data;
  const listing = b.rentalId?.listingId;
  const days = rentalDays(b.startDate, b.endDate);
  const rate = b.rentalId?.dailyRate ?? Math.round(b.totalAmount / days);
  const customer = b.source === "WALK_IN" && b.walkIn
    ? { name: b.walkIn.name, phone: b.walkIn.phone, email: b.walkIn.email, cnic: b.walkIn.cnic }
    : { name: b.renterId?.name, phone: b.renterId?.phone, email: b.renterId?.email, cnic: undefined };
  const status = STATUS_LABEL[b.status] ?? STATUS_LABEL.PENDING;

  return (
    <div className="slip-root min-h-screen bg-[#f6f8fa] px-4 py-6 sm:px-6">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .biz-desktop-sidebar, .biz-mobile-topbar, .no-print { display: none !important; }
          .biz-content { padding: 0 !important; }
          html, body, .biz-root, .slip-root { background: white !important; }
          .slip-root { padding: 0 !important; min-height: 0 !important; }
          .slip-card { box-shadow: none !important; border: none !important; max-width: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print mx-auto mb-4 flex max-w-[780px] items-center justify-between gap-3">
        <Link href="/business/bookings" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#57606a] hover:text-[#0d1117]">
          <ArrowLeft size={15} /> Bookings
        </Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-[#0d1117] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#24292f]">
          <Printer size={15} /> Print / Save PDF
        </button>
      </div>

      <article className="slip-card mx-auto max-w-[780px] overflow-hidden rounded-2xl border border-[#e1e4e8] bg-white shadow-[0_10px_40px_-20px_rgba(15,23,42,0.35)]">
        {/* Letterhead */}
        <header className="flex flex-wrap items-start justify-between gap-6 bg-slate-950 px-8 py-7 text-white">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 via-fuchsia-400 to-amber-300 text-lg font-extrabold text-slate-950">
              {org?.name?.[0]?.toUpperCase() || "B"}
            </span>
            <div>
              <p className="text-lg font-bold leading-tight">{org?.name || "Business"}</p>
              {(org?.address || org?.city) && <p className="mt-1 text-xs text-slate-400">{[org?.address, org?.city].filter(Boolean).join(", ")}</p>}
              <p className="mt-0.5 text-xs text-slate-400">{[org?.phone, org?.email].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">Booking slip</p>
            <p className="mt-1 font-mono text-2xl font-bold">{bookingNumber(b._id)}</p>
            <p className="mt-1 text-xs text-slate-400">Issued {dateTime(new Date().toISOString())}</p>
          </div>
        </header>

        <div className="px-8 py-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full px-3 py-1 text-[11px] font-bold tracking-wider" style={{ background: status.bg, color: status.color }}>{status.text}</span>
            <span className="text-xs text-slate-500">
              {b.source === "WALK_IN" ? "Walk-in booking" : "Online booking via AutoMarket"} · created {dateTime(b.createdAt)}
              {b.createdBy?.name ? ` by ${b.createdBy.name}` : ""}
            </span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <section className="rounded-xl border border-[#e1e4e8] p-4">
              <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Customer</h2>
              <Row label="Name" value={customer.name || "—"} />
              <Row label="Phone" value={customer.phone} />
              <Row label="Email" value={customer.email} />
              <Row label="CNIC" value={customer.cnic} />
            </section>
            <section className="rounded-xl border border-[#e1e4e8] p-4">
              <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Vehicle</h2>
              <Row label="Vehicle" value={listing?.title || "—"} />
              <Row label="Make / model" value={listing ? `${listing.make} ${listing.model} (${listing.year})` : undefined} />
              <Row label="Colour" value={listing?.color} />
              <Row label="Fuel / gearbox" value={[listing?.fuelType, listing?.transmission].filter(Boolean).join(" · ") || undefined} />
            </section>
          </div>

          <section className="mt-6 grid grid-cols-3 overflow-hidden rounded-xl border border-[#e1e4e8] text-center">
            <div className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Pickup</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{date(b.startDate)}</p>
            </div>
            <div className="border-x border-[#e1e4e8] bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Duration</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{days} day{days !== 1 ? "s" : ""}</p>
            </div>
            <div className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Return</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{date(b.endDate)}</p>
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-xl border border-[#e1e4e8]">
            <table className="w-full text-[13px]">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400">
                <tr><th className="px-4 py-2.5 font-bold">Charge</th><th className="px-4 py-2.5 text-right font-bold">Amount</th></tr>
              </thead>
              <tbody className="divide-y divide-[#e1e4e8]">
                <tr>
                  <td className="px-4 py-3 text-slate-700">Rental · {days} day{days !== 1 ? "s" : ""} × {pkr(rate)}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">{pkr(b.totalAmount)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-700">Security deposit <span className="text-slate-400">(refundable)</span></td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">{pkr(b.deposit)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-slate-950 text-white">
                  <td className="px-4 py-3.5 font-bold">Total</td>
                  <td className="px-4 py-3.5 text-right text-base font-extrabold tabular-nums">{pkr(b.totalAmount + b.deposit)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          {(b.confirmedAt || b.startedAt || b.completedAt || b.notes) && (
            <section className="mt-6 grid gap-6 sm:grid-cols-2">
              {(b.confirmedAt || b.startedAt || b.completedAt) && (
                <div>
                  <h2 className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">History</h2>
                  <Row label="Confirmed" value={b.confirmedAt && dateTime(b.confirmedAt)} />
                  <Row label="Handed over" value={b.startedAt && dateTime(b.startedAt)} />
                  <Row label="Returned" value={b.completedAt && dateTime(b.completedAt)} />
                </div>
              )}
              {b.notes && (
                <div>
                  <h2 className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Notes</h2>
                  <p className="text-[13px] leading-relaxed text-slate-700">{b.notes}</p>
                </div>
              )}
            </section>
          )}

          {/* Signatures */}
          <section className="mt-12 grid grid-cols-2 gap-10">
            {["Customer signature", `For ${org?.name || "the business"}`].map(label => (
              <div key={label}>
                <div className="h-10 border-b border-dashed border-slate-300" />
                <p className="mt-2 text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </section>
        </div>

        <footer className="border-t border-[#e1e4e8] bg-slate-50 px-8 py-3 text-center text-[11px] text-slate-400">
          {bookingNumber(b._id)} · Generated with AutoMarket Business
        </footer>
      </article>
    </div>
  );
}
