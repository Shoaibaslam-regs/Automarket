"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import AutoGOStamp from "@/components/bookings/AutoGOStamp";
import { PAYMENT_LABEL } from "@/lib/payments";
import { PURCHASE_LABEL, PURCHASE_STYLE, purchaseNumber, purchasePayment, salePrice, type PurchaseStatus } from "@/lib/purchases";

export type SaleSlipData = {
  purchase: {
    _id: string;
    status: PurchaseStatus;
    source: "ONLINE" | "WALK_IN";
    vehicle: { title: string; make?: string; model?: string; year?: number };
    buyer: { name: string; phone: string; email?: string; cnic?: string };
    askingPrice: number;
    offerPrice?: number;
    agreedPrice?: number;
    amountPaid?: number;
    plateNumber?: string;
    message?: string;
    notes?: string;
    declineReason?: string;
    createdAt: string;
    acceptedAt?: string;
    completedAt?: string;
    declinedAt?: string;
    cancelledAt?: string;
    createdBy?: { name?: string } | null;
  };
  organization: { name: string; phone?: string; email?: string; address?: string; city?: string } | null;
};

/** The printable width of an A4 page with 12 mm margins; the sheet scales down to fit narrower screens. */
const SHEET_WIDTH = 703;

const dateTime = (d?: string) => (d ? new Date(d).toLocaleString("en-PK", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString()}`;

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 py-[3px] text-[12px]">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

/**
 * One-page sale slip (invoice) for a direct purchase, used by the business console and the buyer.
 * Print or "Save as PDF" from the browser; the stamp's caption follows the stage (request received, sale agreed, sale completed).
 */
export default function SaleSlip({ data, backHref, backLabel, showNotes }: { data: SaleSlipData; backHref: string; backLabel: string; showNotes?: boolean }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setFit(Math.min(1, entry.contentRect.width / SHEET_WIDTH)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { purchase: p, organization: org } = data;
  const st = PURCHASE_STYLE[p.status];
  const price = salePrice(p);
  const pay = purchasePayment(p);
  const sold = p.status === "COMPLETED";
  const closedWithoutSale = p.status === "DECLINED" || p.status === "CANCELLED";
  // Every live slip is stamped, worded for its stage; declined and cancelled ones aren't
  const stamp = sold ? { caption: "SALE COMPLETED", at: p.completedAt }
    : p.status === "ACCEPTED" ? { caption: "SALE AGREED", at: p.acceptedAt }
    : p.status === "REQUESTED" ? { caption: "REQUEST RECEIVED", at: p.createdAt }
    : null;

  return (
    <div className="slip-root theme-static min-h-screen bg-[var(--gh-f6f8fa)] px-4 py-6 sm:px-6">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .biz-desktop-sidebar, .biz-mobile-topbar, .no-print, nav, header.site-header, footer.site-footer { display: none !important; }
          .biz-content { padding: 0 !important; }
          html, body, .biz-root, .slip-root { background: white !important; }
          .slip-root { padding: 0 !important; min-height: 0 !important; }
          .slip-frame { max-width: none !important; }
          .slip-card { box-shadow: none !important; border: none !important; border-radius: 0 !important; width: 100% !important; zoom: 1 !important; break-inside: avoid; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[703px] items-center justify-between gap-3">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--gh-57606a)] hover:text-[var(--gh-0d1117)]">
          <ArrowLeft size={15} /> {backLabel}
        </Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-[var(--gh-0d1117)] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[var(--gh-24292f)]">
          <Printer size={15} /> Print / Save PDF
        </button>
      </div>

      <div ref={frameRef} className="slip-frame mx-auto max-w-[703px]">
        <article style={{ width: SHEET_WIDTH, zoom: fit }} className="slip-card overflow-hidden rounded-2xl border border-[var(--gh-e1e4e8)] bg-white shadow-[0_10px_40px_-20px_rgba(15,23,42,0.35)]">
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
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">{sold ? "Sale slip" : "Purchase request"}</p>
              <p className="mt-1 font-mono text-2xl font-bold">{purchaseNumber(p._id)}</p>
              <p className="mt-1 text-xs text-slate-400">Issued {dateTime(new Date().toISOString())}</p>
            </div>
          </header>

          <div className="px-6 py-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider" style={{ background: st.bg, color: st.color }}>{PURCHASE_LABEL[p.status]}</span>
              <span className="text-xs text-slate-500">
                {p.source === "WALK_IN" ? "Walk-in sale" : "Online purchase request via AutoGO"} · {dateTime(p.createdAt)}
                {p.createdBy?.name ? ` by ${p.createdBy.name}` : ""}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <section className="rounded-xl border border-[var(--gh-e1e4e8)] px-3.5 py-3">
                <h2 className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Buyer</h2>
                <Row label="Name" value={p.buyer.name} />
                <Row label="Phone" value={p.buyer.phone} />
                <Row label="Email" value={p.buyer.email} />
                <Row label="CNIC" value={p.buyer.cnic && <span className="font-mono tracking-wide">{p.buyer.cnic}</span>} />
              </section>
              <section className="rounded-xl border border-[var(--gh-e1e4e8)] px-3.5 py-3">
                <h2 className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Vehicle</h2>
                <Row label="Vehicle" value={<span className="block max-w-[200px] text-right">{p.vehicle.title}</span>} />
                <Row label="Make / model" value={p.vehicle.make ? `${p.vehicle.make} ${p.vehicle.model ?? ""}${p.vehicle.year ? ` (${p.vehicle.year})` : ""}` : undefined} />
                <Row label="Number plate" value={p.plateNumber && <span className="rounded border-2 border-slate-900 px-1.5 font-mono font-black tracking-[0.12em] text-slate-900">{p.plateNumber}</span>} />
              </section>
            </div>

            <section className="mt-4 overflow-hidden rounded-xl border border-[var(--gh-e1e4e8)]">
              <table className="w-full text-[12px]">
                <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <tr><th className="px-4 py-2 font-bold">Price</th><th className="px-4 py-2 text-right font-bold">Amount</th></tr>
                </thead>
                <tbody className="divide-y divide-[var(--gh-e1e4e8)]">
                  <tr>
                    <td className="px-4 py-2 text-slate-700">Asking price</td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums text-slate-900">{pkr(p.askingPrice)}</td>
                  </tr>
                  {p.offerPrice !== undefined && (
                    <tr>
                      <td className="px-4 py-2 text-slate-700">Buyer&apos;s offer</td>
                      <td className="px-4 py-2 text-right font-medium tabular-nums text-slate-900">{pkr(p.offerPrice)}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-950 text-white">
                    <td className="px-4 py-2.5 font-bold">{p.agreedPrice !== undefined ? "Agreed sale price" : "Price"}</td>
                    <td className="px-4 py-2.5 text-right text-base font-extrabold tabular-nums">{pkr(price)}</td>
                  </tr>
                  {!closedWithoutSale && (
                    <tr className="border-t border-[var(--gh-e1e4e8)]">
                      <td className="px-4 py-2 text-slate-700">
                        <span className={`mr-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${pay.status === "PAID" ? "bg-emerald-100 text-emerald-800" : pay.status === "PARTIAL" ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800"}`}>
                          {PAYMENT_LABEL[pay.status]}
                        </span>
                        {pay.paid > 0 && <>Paid so far {pkr(pay.paid)}</>}
                      </td>
                      <td className={`px-4 py-2 text-right font-bold tabular-nums ${pay.balance > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                        {pay.balance > 0 ? `Balance due ${pkr(pay.balance)}` : "Nothing due"}
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </section>
            {p.declineReason && <p className="mt-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] text-rose-800"><strong>Declined:</strong> {p.declineReason}</p>}

            <section className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <h2 className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">History</h2>
                <Row label="Requested" value={dateTime(p.createdAt)} />
                <Row label="Accepted" value={p.acceptedAt && dateTime(p.acceptedAt)} />
                <Row label="Sold" value={p.completedAt && dateTime(p.completedAt)} />
                <Row label="Declined" value={p.declinedAt && dateTime(p.declinedAt)} />
                <Row label="Cancelled" value={p.cancelledAt && dateTime(p.cancelledAt)} />
              </div>
              {(p.message || (showNotes && p.notes)) && (
                <div>
                  <h2 className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Notes</h2>
                  {p.message && <p className="line-clamp-3 text-[12px] leading-relaxed text-slate-700"><span className="text-slate-400">Buyer:</span> {p.message}</p>}
                  {showNotes && p.notes && <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-slate-700"><span className="text-slate-400">Business:</span> {p.notes}</p>}
                </div>
              )}
            </section>

            {sold && (
              <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
                The buyer has received the vehicle described above in the condition inspected, together with its documents and keys.
                Ownership transfer and registration are handled between the buyer and the seller.
              </p>
            )}

            <section className="mt-14 grid grid-cols-2 gap-10">
              {["Buyer signature", `For ${org?.name || "the business"}`].map((label, i) => (
                <div key={label} className="relative">
                  <div className="h-10 border-b border-dashed border-slate-300" />
                  <p className="mt-2 text-xs text-slate-500">{label}</p>
                  {i === 1 && stamp && (
                    <AutoGOStamp
                      business={org?.name}
                      caption={stamp.caption}
                      date={new Date(stamp.at || p.createdAt).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                      className="pointer-events-none absolute bottom-[34px] right-0 h-auto w-[200px] max-w-full -rotate-[5deg] opacity-90 mix-blend-multiply"
                    />
                  )}
                </div>
              ))}
            </section>
          </div>

          <footer className="border-t border-[var(--gh-e1e4e8)] bg-slate-50 px-6 py-2.5 text-center text-[11px] text-slate-400">
            {purchaseNumber(p._id)} · Generated with AutoGO
          </footer>
        </article>
      </div>
    </div>
  );
}
