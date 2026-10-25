"use client";

import { use, useEffect, useRef, useState } from "react";
import { DEPOSIT_LABEL, FUEL_LABEL, depositState, kmDriven, type Check } from "@/lib/checklist";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { LATE_RULE_TEXT, bookingNumber, rentalDays, type BookingStatus } from "@/lib/bookings";
import { bookingCnic } from "@/lib/plates";
import { dealLabel } from "@/lib/deals";
import AutoGOStamp from "@/components/bookings/AutoGOStamp";
import { PAYMENT_LABEL, paymentState } from "@/lib/payments";

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
    plateNumber?: string;
    renterCnic?: string;
    dueBackAt?: string;
    returnedAt?: string;
    lateDays?: number;
    lateFee?: number;
    checkOut?: Check | null;
    checkIn?: Check | null;
    extraCharges?: number;
    extraChargesNote?: string;
    depositRefunded?: number;
    depositNote?: string;
    depositSettledAt?: string | null;
    amountPaid?: number;
    offListVehicle?: { title: string; dailyRate: number; deposit: number } | null;
    createdAt: string;
    confirmedAt?: string;
    startedAt?: string;
    completedAt?: string;
    dealId?: { title: string; make: string; model: string; year: number; address?: string; location?: string; vehicleCount?: number; discountType: "PERCENT" | "AMOUNT"; discountValue: number } | null;
    rentalId?: {
      dailyRate: number;
      listingId?: { title: string; make: string; model: string; year: number; color?: string; fuelType?: string; transmission?: string; location?: string; address?: string } | null;
    } | null;
  };
  organization: { name: string; phone?: string; email?: string; address?: string; city?: string; type?: string } | null;
};

const STATUS_LABEL: Record<BookingStatus, { text: string; color: string; bg: string }> = {
  PENDING: { text: "PENDING", color: "var(--gh-7d4e00)", bg: "var(--gh-fff8c5)" },
  CONFIRMED: { text: "CONFIRMED", color: "var(--gh-0550ae)", bg: "var(--gh-ddf4ff)" },
  ACTIVE: { text: "VEHICLE OUT", color: "var(--gh-1a7f37)", bg: "var(--gh-dafbe1)" },
  COMPLETED: { text: "COMPLETED", color: "var(--gh-57606a)", bg: "var(--gh-f6f8fa)" },
  CANCELLED: { text: "CANCELLED", color: "var(--gh-cf222e)", bg: "var(--gh-fff0f0)" },
};

const date = (d?: string) => (d ? new Date(d).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—");
const dateTime = (d?: string) => (d ? new Date(d).toLocaleString("en-PK", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
const pkr = (n: number) => `PKR ${n.toLocaleString()}`;

/** The printable width of an A4 page with 12 mm margins (186 mm at 96 dpi). The slip is laid out at this width and scaled to fit smaller screens. */
const SHEET_WIDTH = 703;
/** The printable height of that page (273 mm); a taller sheet is shrunk to fit when printing. */
const SHEET_HEIGHT = 1020;

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 py-[3px] text-[12px]">
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
  // Phones and narrow windows show the same one-page sheet, scaled down to fit the width
  const frameRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  const cardRef = useRef<HTMLElement>(null);
  const [printZoom, setPrintZoom] = useState(1);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const f = Math.min(1, entry.contentRect.width / SHEET_WIDTH);
      setFit(f);
      // A slip with every section filled in can run past one page; printing shrinks it to fit
      const card = cardRef.current;
      if (card) setPrintZoom(Math.min(1, SHEET_HEIGHT / (card.getBoundingClientRect().height / f)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [data]);

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
      <div className="flex min-h-screen items-center justify-center bg-[var(--gh-f6f8fa)] p-6">
        <div className="rounded-2xl border border-[var(--gh-ffcdd2)] bg-white p-8 text-center">
          <p className="text-sm font-semibold text-[var(--gh-cf222e)]">{error}</p>
          <Link href="/business/bookings" className="mt-3 inline-block text-[13px] font-semibold text-[var(--gh-0d1117)] underline">Back to bookings</Link>
        </div>
      </div>
    );
  }
  if (!data) return <div className="min-h-screen animate-pulse bg-[var(--gh-f6f8fa)]" />;

  const { booking: b, organization: org } = data;
  const deal = b.dealId ?? null;
  // A deal booking shows the deal's vehicle details in place of a listing's
  const listing = b.rentalId?.listingId ?? (deal ? { title: deal.title, make: deal.make, model: deal.model, year: deal.year } as NonNullable<NonNullable<typeof b.rentalId>["listingId"]> : undefined);
  const days = rentalDays(b.startDate, b.endDate);
  const rate = b.rentalId?.dailyRate ?? b.offListVehicle?.dailyRate ?? Math.round(b.totalAmount / days);
  const customer = b.walkIn && (b.source === "WALK_IN" || !b.renterId)
    ? { name: b.walkIn.name, phone: b.walkIn.phone, email: b.walkIn.email, cnic: bookingCnic(b) }
    : { name: b.renterId?.name, phone: b.renterId?.phone, email: b.renterId?.email, cnic: bookingCnic(b) };
  const status = STATUS_LABEL[b.status] ?? STATUS_LABEL.PENDING;
  const pay = paymentState(b);
  const dep = depositState(b);
  // Where the customer collects the vehicle: the deal's or listing's address, else the business address
  const pickup = deal?.address || b.rentalId?.listingId?.address || org?.address;
  const pickupCity = deal?.location || b.rentalId?.listingId?.location || org?.city;

  return (
    <div className="slip-root theme-static min-h-screen bg-[var(--gh-f6f8fa)] px-4 py-6 sm:px-6">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .biz-desktop-sidebar, .biz-mobile-topbar, .no-print { display: none !important; }
          .biz-content { padding: 0 !important; }
          html, body, .biz-root, .slip-root { background: white !important; }
          .slip-root { padding: 0 !important; min-height: 0 !important; }
          .slip-frame { max-width: none !important; }
          .slip-card { box-shadow: none !important; border: none !important; border-radius: 0 !important; width: 100% !important; zoom: var(--print-zoom, 1) !important; break-inside: avoid; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print mx-auto mb-4 flex max-w-[703px] items-center justify-between gap-3">
        <Link href="/business/bookings" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--gh-57606a)] hover:text-[var(--gh-0d1117)]">
          <ArrowLeft size={15} /> Bookings
        </Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-[var(--gh-0d1117)] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[var(--gh-24292f)]">
          <Printer size={15} /> Print / Save PDF
        </button>
      </div>

      <div ref={frameRef} className="slip-frame mx-auto max-w-[703px]">
      <article ref={cardRef} style={{ width: SHEET_WIDTH, zoom: fit, "--print-zoom": printZoom } as React.CSSProperties} className="slip-card overflow-hidden rounded-2xl border border-[var(--gh-e1e4e8)] bg-white shadow-[0_10px_40px_-20px_rgba(15,23,42,0.35)]">
        {/* Letterhead */}
        <header className="flex items-start justify-between gap-6 bg-slate-950 px-6 py-5 text-white">
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

        <div className="px-6 py-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="rounded-full px-3 py-1 text-[11px] font-bold tracking-wider" style={{ background: status.bg, color: status.color }}>{status.text}</span>
            <span className="text-xs text-slate-500">
              {deal && <span className="mr-2 inline-flex items-center rounded-full bg-gradient-to-r from-rose-600 to-orange-500 px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-white">DEAL · {dealLabel(deal)}</span>}
              {b.source === "WALK_IN" ? "Walk-in booking" : "Online booking via AutoGO"} · created {dateTime(b.createdAt)}
              {b.createdBy?.name ? ` by ${b.createdBy.name}` : ""}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <section className="rounded-xl border border-[var(--gh-e1e4e8)] px-3.5 py-3">
              <h2 className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Customer</h2>
              <Row label="Name" value={customer.name || "—"} />
              <Row label="Phone" value={customer.phone} />
              <Row label="Email" value={customer.email} />
              <Row label="CNIC" value={customer.cnic && <span className="font-mono tracking-wide">{customer.cnic}</span>} />
            </section>
            <section className="rounded-xl border border-[var(--gh-e1e4e8)] px-3.5 py-3">
              <h2 className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Vehicle</h2>
              <Row label={deal ? "Deal" : "Vehicle"} value={listing?.title || b.offListVehicle?.title || "—"} />
              {deal && (deal.vehicleCount ?? 1) > 1 && <Row label="Cars in package" value={String(deal.vehicleCount)} />}
              <Row label="Number plate" value={b.plateNumber && <span className="rounded border-2 border-slate-900 px-1.5 font-mono font-black tracking-[0.12em] text-slate-900">{b.plateNumber}</span>} />
              <Row label="Make / model" value={listing ? `${listing.make} ${listing.model} (${listing.year})` : undefined} />
              <Row label="Colour" value={listing?.color} />
              <Row label="Pickup address" value={pickup && <span className="block max-w-[220px] text-right">{pickup}{pickupCity && !pickup.toLowerCase().includes(pickupCity.toLowerCase()) ? `, ${pickupCity}` : ""}</span>} />
              <Row label="Fuel / gearbox" value={[listing?.fuelType, listing?.transmission].filter(Boolean).join(" · ") || undefined} />
            </section>
          </div>

          <section className="mt-4 grid grid-cols-3 overflow-hidden rounded-xl border border-[var(--gh-e1e4e8)] text-center">
            <div className="px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Pickup</p>
              <p className="mt-0.5 text-[13px] font-semibold text-slate-900">{date(b.startDate)}</p>
            </div>
            <div className="border-x border-[var(--gh-e1e4e8)] bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Duration</p>
              <p className="mt-0.5 text-[13px] font-semibold text-slate-900">{days} day{days !== 1 ? "s" : ""}</p>
            </div>
            <div className="px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{b.dueBackAt ? "Return by" : "Return"}</p>
              <p className="mt-0.5 text-[13px] font-semibold text-slate-900">{b.dueBackAt ? dateTime(b.dueBackAt) : date(b.endDate)}</p>
            </div>
          </section>

          <section className="mt-4 overflow-hidden rounded-xl border border-[var(--gh-e1e4e8)]">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400">
                <tr><th className="px-4 py-2 font-bold">Charge</th><th className="px-4 py-2 text-right font-bold">Amount</th></tr>
              </thead>
              <tbody className="divide-y divide-[var(--gh-e1e4e8)]">
                <tr>
                  <td className="px-4 py-2 text-slate-700">Rental · {days} day{days !== 1 ? "s" : ""} × {pkr(rate)}</td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums text-slate-900">{pkr(b.totalAmount)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-slate-700">Security deposit <span className="text-slate-400">(refundable)</span></td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums text-slate-900">{pkr(b.deposit)}</td>
                </tr>
                {(b.lateFee ?? 0) > 0 && (
                  <tr className="bg-rose-50/60">
                    <td className="px-4 py-2 text-rose-700">
                      Late return · {b.lateDays} extra day{b.lateDays !== 1 ? "s" : ""} × {pkr(Math.round(b.lateFee! / b.lateDays!))}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums text-rose-700">{pkr(b.lateFee!)}</td>
                  </tr>
                )}
                {(b.extraCharges ?? 0) > 0 && (
                  <tr className="bg-rose-50/60">
                    <td className="px-4 py-2 text-rose-700">Extra charges{b.extraChargesNote ? ` · ${b.extraChargesNote}` : ""}</td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums text-rose-700">{pkr(b.extraCharges!)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-950 text-white">
                  <td className="px-4 py-2.5 font-bold">Total</td>
                  <td className="px-4 py-2.5 text-right text-base font-extrabold tabular-nums">{pkr(b.totalAmount + b.deposit + (b.lateFee ?? 0) + (b.extraCharges ?? 0))}</td>
                </tr>
                {b.status !== "CANCELLED" && (
                  <tr className="border-t border-[var(--gh-e1e4e8)]">
                    <td className="px-4 py-2 text-slate-700">
                      <span className={`mr-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${pay.status === "PAID" ? "bg-emerald-100 text-emerald-800" : pay.status === "PARTIAL" ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800"}`}>
                        {PAYMENT_LABEL[pay.status]}
                      </span>
                      {pay.paid > 0 && <>Paid so far {pkr(pay.paid)}</>}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold tabular-nums ${pay.balance > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                      {pay.balance > 0 ? `Balance due ${pkr(pay.balance)}` : "Nothing due"}
                    </td>
                  </tr>
                )}
                {dep.status !== "NONE" && dep.status !== "HELD" && (
                  <tr className="border-t border-[var(--gh-e1e4e8)]">
                    <td className="px-4 py-2 text-slate-700">
                      {DEPOSIT_LABEL[dep.status]}{dep.kept > 0 && b.depositNote ? <span className="text-slate-400"> · kept for: {b.depositNote}</span> : ""}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums text-slate-900">
                      {pkr(dep.refunded)} returned{dep.kept > 0 ? ` · ${pkr(dep.kept)} kept` : ""}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </section>
          {b.dueBackAt && !b.returnedAt && (
            <p className="mt-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800">
              <strong>Late return:</strong> bring the vehicle back by {dateTime(b.dueBackAt)}. {LATE_RULE_TEXT}
            </p>
          )}

          {(b.checkOut || b.checkIn) && (
            <section className="mt-4 overflow-hidden rounded-xl border border-[var(--gh-e1e4e8)]">
              <table className="w-full text-[12px]">
                <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-1.5 font-bold">Condition</th>
                    <th className="px-4 py-1.5 font-bold">Odometer{kmDriven(b) != null && <span className="ml-1 normal-case tracking-normal text-slate-900">· {kmDriven(b)!.toLocaleString()} km driven</span>}</th>
                    <th className="px-4 py-1.5 font-bold">Fuel</th>
                    <th className="px-4 py-1.5 font-bold">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--gh-e1e4e8)]">
                  {([["Handed over", b.checkOut], ["Returned", b.checkIn]] as const).map(([label, c]) => c && (
                    <tr key={label}>
                      <td className="px-4 py-1.5 font-semibold text-slate-700">{label}</td>
                      <td className="px-4 py-1.5 tabular-nums text-slate-900">{c.odometer != null ? `${c.odometer.toLocaleString()} km` : "—"}</td>
                      <td className="px-4 py-1.5 text-slate-900">{c.fuel ? FUEL_LABEL[c.fuel] : "—"}</td>
                      <td className="max-w-[260px] truncate px-4 py-1.5 text-slate-600">{c.notes || (c.photos?.length ? `${c.photos.length} photo${c.photos.length !== 1 ? "s" : ""} on record` : "—")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {(b.confirmedAt || b.startedAt || b.completedAt || b.notes) && (
            <section className="mt-4 grid grid-cols-2 gap-4">
              {(b.confirmedAt || b.startedAt || b.completedAt) && (
                <div>
                  <h2 className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">History</h2>
                  <p className="text-[11px] leading-relaxed text-slate-700">
                    {[
                      b.confirmedAt && `Confirmed ${dateTime(b.confirmedAt)}`,
                      b.startedAt && `Handed over ${dateTime(b.startedAt)}`,
                      (b.returnedAt || b.completedAt) && `Returned ${dateTime((b.returnedAt || b.completedAt)!)}`,
                    ].filter(Boolean).join(" · ")}
                  </p>
                </div>
              )}
              {b.notes && (
                <div>
                  <h2 className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Notes</h2>
                  <p className="line-clamp-4 text-[12px] leading-relaxed text-slate-700">{b.notes}</p>
                </div>
              )}
            </section>
          )}

          {/* Signatures */}
          <section className="mt-12 grid grid-cols-2 gap-10">
            {["Customer signature", `For ${org?.name || "the business"}`].map((label, i) => (
              <div key={label} className="relative">
                <div className="h-10 border-b border-dashed border-slate-300" />
                <p className="mt-2 text-xs text-slate-500">{label}</p>
                {/* The business side carries the AutoGO-Pak stamp, inked over the signature line */}
                {i === 1 && (
                  <AutoGOStamp
                    business={org?.name}
                    date={new Date(b.confirmedAt || b.createdAt).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                    className="pointer-events-none absolute bottom-[34px] right-0 h-auto w-[160px] max-w-full -rotate-[5deg] opacity-90 mix-blend-multiply"
                  />
                )}
              </div>
            ))}
          </section>
        </div>

        <footer className="border-t border-[var(--gh-e1e4e8)] bg-slate-50 px-6 py-2.5 text-center text-[11px] text-slate-400">
          {bookingNumber(b._id)} · Generated with AutoGO Business
        </footer>
      </article>
      </div>
    </div>
  );
}
