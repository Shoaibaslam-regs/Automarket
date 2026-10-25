"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Car, FileText, MessageSquare, MoreHorizontal, Phone, ShoppingBag, Store, Trash2, X } from "lucide-react";
import ConfirmDialog from "@/components/business/ConfirmDialog";
import { PaymentTag } from "@/components/bookings/PaymentTag";
import { InstallmentLine } from "@/components/sales/Installments";
import type { InstallmentPlan } from "@/lib/installments";
import { refreshNotificationCounts } from "@/hooks/useNotificationCounts";
import { OPEN_PURCHASE_STATUSES, PURCHASE_LABEL, REMOVABLE_PURCHASE_STATUSES, PURCHASE_STYLE, asPayable, purchaseNumber, salePrice, type PurchaseStatus } from "@/lib/purchases";
import StatusText from "@/components/ui/StatusText";
import StepTrack from "@/components/ui/StepTrack";
import { purchaseSteps } from "@/lib/requestSteps";

type MyPurchase = {
  _id: string;
  status: PurchaseStatus;
  listingId?: string;
  dealId?: string;
  vehicle: { title: string; make?: string; model?: string; year?: number; image?: string };
  askingPrice: number;
  offerPrice?: number;
  agreedPrice?: number;
  amountPaid?: number;
  installmentPlan?: InstallmentPlan | null;
  message?: string;
  declineReason?: string;
  seenByBuyer: boolean;
  createdAt: string;
  business: { _id: string; name: string; slug?: string; phone?: string; address?: string; city?: string } | null;
};

const fmt = (d: string) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString()}`;

/** The buyer's purchase requests and completed purchases from businesses. */
export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<MyPurchase[] | null>(null);
  const [error, setError] = useState("");
  const [openMore, setOpenMore] = useState<string | null>(null);
  const [cancelFor, setCancelFor] = useState<MyPurchase | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [removeFor, setRemoveFor] = useState<MyPurchase | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");

  useEffect(() => {
    fetch("/api/purchases")
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Couldn't load your purchases");
        setPurchases(d.purchases);
        // Opening the list marks updates seen, so the menu badge clears
        refreshNotificationCounts();
      })
      .catch(e => setError(e.message));
  }, []);

  async function cancel() {
    if (!cancelFor) return;
    setCancelling(true);
    setCancelError("");
    const res = await fetch(`/api/purchases/${cancelFor._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }) });
    const d = await res.json().catch(() => ({}));
    setCancelling(false);
    if (!res.ok) { setCancelError(d.error || "Couldn't cancel"); return; }
    const id = cancelFor._id;
    setPurchases(prev => prev?.map(p => (p._id === id ? { ...p, status: "CANCELLED" } : p)) ?? null);
    setCancelFor(null);
  }

  async function remove() {
    if (!removeFor) return;
    setRemoving(true);
    setRemoveError("");
    const res = await fetch(`/api/purchases/${removeFor._id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    setRemoving(false);
    if (!res.ok) { setRemoveError(d.error || "Couldn't remove it"); return; }
    const id = removeFor._id;
    setPurchases(prev => prev?.filter(p => p._id !== id) ?? null);
    setRemoveFor(null);
    refreshNotificationCounts();
  }

  const iconBtn = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-2.5 text-xs font-semibold transition hover:bg-[var(--gh-f6f8fa)]";

  return (
    <div className="min-h-screen bg-[var(--gh-f6f8fa)] px-4 py-8 sm:px-6">
      <ConfirmDialog
        open={cancelFor !== null}
        onOpenChange={o => !o && setCancelFor(null)}
        title="Cancel this purchase request?"
        description={<>Your request for <strong>{cancelFor?.vehicle.title}</strong> will be withdrawn and the business will be told.</>}
        confirmLabel="Cancel request"
        loadingLabel="Cancelling..."
        loading={cancelling}
        error={cancelError}
        onConfirm={cancel}
      />
      <ConfirmDialog
        open={removeFor !== null}
        onOpenChange={o => !o && setRemoveFor(null)}
        title="Remove from My purchases?"
        description={<><strong>{removeFor?.vehicle.title}</strong> ({removeFor ? purchaseNumber(removeFor._id) : ""}) leaves your list. The business keeps its own record{removeFor?.status === "COMPLETED" ? ", so ask them if you need the sale slip again" : ""}.</>}
        confirmLabel="Remove"
        loadingLabel="Removing..."
        loading={removing}
        error={removeError}
        onConfirm={remove}
      />
      <div className="mx-auto max-w-[900px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--gh-0d1117)]">My purchases</h1>
            <p className="text-sm text-[var(--gh-57606a)]">Vehicles you asked to buy from businesses on AutoGO</p>
          </div>
          <Link href="/listings?type=SALE" className="rounded-lg bg-[var(--gh-0d1117)] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[var(--gh-24292f)]">Browse vehicles</Link>
        </div>

        {error ? (
          <p className="rounded-2xl border border-[var(--gh-ffcdd2)] bg-[var(--gh-fff0f0)] p-6 text-center text-sm text-[var(--gh-cf222e)]">{error}</p>
        ) : purchases === null ? (
          <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-40 animate-pulse rounded-2xl bg-white" />)}</div>
        ) : purchases.length === 0 ? (
          <div className="rounded-2xl border border-[var(--gh-e1e4e8)] bg-white px-6 py-14 text-center">
            <ShoppingBag size={30} strokeWidth={1.5} className="mx-auto mb-3 text-[var(--gh-8c959f)]" />
            <p className="text-sm font-semibold text-[var(--gh-0d1117)]">No purchases yet</p>
            <p className="mt-1 text-[13px] text-[var(--gh-57606a)]">Open a vehicle sold by a business and tap &quot;Buy this vehicle&quot;.</p>
            <Link href="/listings?type=SALE" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--gh-0d1117)] px-4 py-2.5 text-[13px] font-semibold text-white">Browse cars for sale</Link>
          </div>
        ) : (
          <div className="grid items-start gap-3 lg:grid-cols-2">
            {purchases.map(p => {
              const st = PURCHASE_STYLE[p.status];
              const open = OPEN_PURCHASE_STATUSES.includes(p.status);
              const moreOpen = openMore === p._id;
              const removable = REMOVABLE_PURCHASE_STATUSES.includes(p.status);
              const itemHref = p.listingId ? `/listings/${p.listingId}` : p.dealId ? `/deals/${p.dealId}` : null;
              const showPayment = p.status === "ACCEPTED" || p.status === "COMPLETED";
              return (
                <div key={p._id} className={`overflow-hidden rounded-2xl border bg-white ${!p.seenByBuyer ? "border-[var(--gh-56d364)]" : "border-[var(--gh-e1e4e8)]"}`}>
                  <div className="p-3.5 sm:p-4">
                    <div className="flex gap-3">
                      <div className="relative h-14 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-[var(--gh-f6f8fa)] sm:h-16 sm:w-20">
                        {p.vehicle.image
                          ? <Image src={p.vehicle.image} alt="" fill sizes="80px" className="object-cover" />
                          : <div className="flex h-full items-center justify-center text-[var(--gh-8c959f)]"><Car size={18} strokeWidth={1.5} /></div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          {itemHref
                            ? <Link href={itemHref} className="min-w-0 truncate text-[15px] font-bold leading-tight text-[var(--gh-0d1117)] hover:underline">{p.vehicle.title}</Link>
                            : <p className="min-w-0 truncate text-[15px] font-bold leading-tight text-[var(--gh-0d1117)]">{p.vehicle.title}</p>}
                          <StatusText color={st.color}>{!p.seenByBuyer ? "Updated · " : ""}{PURCHASE_LABEL[p.status]}</StatusText>
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--gh-57606a)]">
                          <span className="font-mono font-bold">{purchaseNumber(p._id)}</span> · requested {fmt(p.createdAt)}
                        </p>
                        {p.business && (
                          <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-[var(--gh-0d1117)]">
                            <Store size={12} className="flex-shrink-0 text-[var(--gh-8c959f)]" />
                            {p.business.slug ? <Link href={`/dealers/${p.business.slug}`} className="truncate font-medium hover:underline">{p.business.name}</Link> : <span className="truncate">{p.business.name}</span>}
                          </p>
                        )}
                      </div>
                    </div>

                    {(() => {
                      const track = purchaseSteps(p.status);
                      return track && <StepTrack {...track} className="mt-3" />;
                    })()}
                    {p.status === "REQUESTED" && <p className="mt-3 text-xs font-medium text-[var(--gh-7d4e00)]">Waiting for the business to accept your request.</p>}
                    {p.status === "ACCEPTED" && <p className="mt-3 text-xs font-medium text-[var(--gh-0550ae)]">Accepted! The business will contact you about payment and handover.</p>}
                    {p.status === "DECLINED" && <p className="mt-3 text-xs font-medium text-[var(--gh-cf222e)]">Declined{p.declineReason ? `: ${p.declineReason}` : ""}</p>}

                    <div className="mt-3">
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <p className="whitespace-nowrap text-base font-extrabold leading-tight tabular-nums text-[var(--gh-0d1117)]">{pkr(salePrice(p))}</p>
                        {showPayment && <PaymentTag booking={asPayable(p)} />}
                      </div>
                      <p className="mt-0.5 text-[11px] text-[var(--gh-8c959f)]">
                        {p.agreedPrice !== undefined ? "Agreed price" : p.offerPrice !== undefined ? "Your offer" : "Asking price"}
                        {p.agreedPrice === undefined && p.offerPrice !== undefined && ` · asking ${pkr(p.askingPrice)}`}
                      </p>
                      {p.installmentPlan && <div className="mt-1"><InstallmentLine plan={p.installmentPlan} /></div>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 border-t border-[var(--gh-e1e4e8)] px-3.5 py-2.5 sm:px-4">
                    <div className="flex flex-1 items-center gap-1.5">
                      {p.status !== "CANCELLED" && (
                        <Link href={`/purchases/${p._id}/slip`} className={`${iconBtn} text-[var(--gh-0d1117)]`}><FileText size={14} /> {p.status === "COMPLETED" ? "Sale slip" : "Slip"}</Link>
                      )}
                      {p.business?.phone && (
                        <a href={`tel:${p.business.phone}`} aria-label="Call the business" className={`${iconBtn} text-[var(--gh-0d1117)]`}><Phone size={14} /> Call</a>
                      )}
                    </div>
                    {(open || removable) && (
                      <button type="button" onClick={() => setOpenMore(moreOpen ? null : p._id)} aria-expanded={moreOpen} aria-label="More actions"
                        className={`${iconBtn} ${moreOpen ? "bg-[var(--gh-f6f8fa)] text-[var(--gh-0d1117)]" : "text-[var(--gh-57606a)]"}`}>
                        <MoreHorizontal size={15} />
                      </button>
                    )}
                  </div>
                  {moreOpen && (open || removable) && (
                    <div className="flex flex-wrap gap-1.5 border-t border-[var(--gh-e1e4e8)] bg-[var(--gh-fafbfc)] px-3.5 py-3 sm:px-4">
                      <Link href="/messages" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--gh-0d1117)]"><MessageSquare size={13} /> Messages</Link>
                      {open && (
                        <button onClick={() => { setCancelError(""); setCancelFor(p); }} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--gh-ffcdd2)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--gh-cf222e)] hover:bg-[var(--gh-fff0f0)]">
                          <X size={13} /> Cancel request
                        </button>
                      )}
                      {removable && (
                        <button onClick={() => { setRemoveError(""); setRemoveFor(p); }} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--gh-ffcdd2)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--gh-cf222e)] hover:bg-[var(--gh-fff0f0)]">
                          <Trash2 size={13} /> Remove
                        </button>
                      )}
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
