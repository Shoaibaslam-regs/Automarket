"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import * as Dialog from "@radix-ui/react-dialog";
import { ShoppingBag, X } from "lucide-react";
import { formatCnicInput } from "@/lib/plates";
import { useRateLock } from "@/hooks/useRateLock";
import RequestSent from "@/components/launch/RequestSent";
import { purchaseSteps } from "@/lib/requestSteps";

const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString()}`;

/**
 * "Buy this vehicle": sends a purchase request to the business selling it (a listing or a sale deal).
 * The business accepts, agrees the price and records the sale; the buyer follows it in My purchases.
 */
export default function BuyRequestButton({ listingId, dealId, title, price, businessName, className = "" }: {
  listingId?: string;
  dealId?: string;
  title: string;
  price: number;
  businessName: string;
  className?: string;
}) {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [offer, setOffer] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const buyLock = useRateLock("purchases");
  // Start with the phone on the buyer's profile, so most people only press Send
  const [profilePhone, setProfilePhone] = useState("");
  useEffect(() => {
    if (!open || status !== "authenticated") return;
    fetch("/api/profile").then(r => (r.ok ? r.json() : null)).then(d => {
      const p = d?.user?.phone?.trim();
      if (p) { setProfilePhone(p); setPhone(prev => prev || p); }
    }).catch(() => {});
  }, [open, status]);

  const btn = `inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 ${className}`;

  if (status !== "authenticated") {
    return (
      <Link href="/login" className={btn}>
        <ShoppingBag size={16} /> Sign in to buy this vehicle
      </Link>
    );
  }

  const offerNum = Number(offer);
  const offerValid = !offer || (Number.isFinite(offerNum) && offerNum >= 1);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!offerValid) { setError("Enter your offer in PKR, or leave it empty to pay the asking price"); return; }
    setSaving(true);
    setError("");
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, dealId, phone, cnic: cnic || undefined, offerPrice: offer || undefined, message }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    buyLock.check(res, data);
    if (!res.ok) { setError(data.error || "Couldn't send your request"); return; }
    setSent(data.purchase?._id ?? "");
  }

  const field = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";

  return (
    <Dialog.Root open={open} onOpenChange={o => { if (!saving) { setOpen(o); if (!o) { setSent(null); setError(""); } } }}>
      <Dialog.Trigger asChild>
        <button type="button" className={btn}><ShoppingBag size={16} /> Buy this vehicle</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-slate-950/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] max-h-[calc(100vh-32px)] w-[calc(100%-32px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start gap-3">
            {sent === null && <span className="flex flex-shrink-0 items-center justify-center text-slate-900"><ShoppingBag size={18} /></span>}
            {/* Once sent, the panel below shows the title; these stay for screen readers */}
            <div className={`min-w-0 flex-1 ${sent !== null ? "sr-only" : ""}`}>
              <Dialog.Title className="text-base font-semibold text-slate-900">{sent !== null ? "Purchase request sent" : "Buy this vehicle"}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">
                {sent !== null ? `${businessName} has your request and will contact you.` : `${title} · asking ${pkr(price)}`}
              </Dialog.Description>
            </div>
            {sent !== null && <span className="flex-1" />}
            <Dialog.Close aria-label="Close" className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></Dialog.Close>
          </div>

          {sent !== null ? (
            <div className="pb-1 pt-2">
              <RequestSent
                title="Purchase request sent"
                subtitle={`${businessName} will contact you to agree the price, then arrange payment and handover. Follow each step in My purchases.`}
                track={purchaseSteps("REQUESTED")!}
              >
                <Link href="/purchases" className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                  Go to My purchases
                </Link>
              </RequestSent>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-3.5">
              <div>
                <label htmlFor="buy-phone" className="mb-1.5 block text-xs font-semibold text-slate-900">Phone number</label>
                <input id="buy-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0300 1234567" className={field} />
                <p className="mt-1 text-[11px] text-slate-400">{profilePhone && phone === profilePhone ? "From your profile. Change it if the business should call another number." : "Leave empty to use the phone on your profile."}</p>
              </div>
              <div>
                <label htmlFor="buy-offer" className="mb-1.5 block text-xs font-semibold text-slate-900">Your offer (optional)</label>
                <input id="buy-offer" type="number" inputMode="numeric" min={1} value={offer} onChange={e => setOffer(e.target.value)} placeholder={`Asking ${pkr(price)}`} className={field} />
                <p className="mt-1 text-[11px] text-slate-400">Leave empty to buy at the asking price.</p>
              </div>
              <div>
                <label htmlFor="buy-cnic" className="mb-1.5 block text-xs font-semibold text-slate-900">CNIC (optional)</label>
                <input id="buy-cnic" inputMode="numeric" value={cnic} onChange={e => setCnic(formatCnicInput(e.target.value))} placeholder="35202-1234567-1" className={`${field} font-mono`} />
              </div>
              <div>
                <label htmlFor="buy-msg" className="mb-1.5 block text-xs font-semibold text-slate-900">Message (optional)</label>
                <textarea id="buy-msg" value={message} onChange={e => setMessage(e.target.value)} rows={2} maxLength={1000} placeholder="e.g. Can I see it on Saturday?"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10" />
              </div>
              {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>}
              <button type="submit" disabled={saving || buyLock.locked} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                {buyLock.locked ? buyLock.text : saving ? "Sending…" : "Send purchase request"}
              </button>
              <p className="text-center text-[11px] text-slate-400">No payment now. You pay the business when you collect the vehicle.</p>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
