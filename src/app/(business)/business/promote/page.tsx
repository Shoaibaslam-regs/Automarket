"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Megaphone, MousePointerClick, Send } from "lucide-react";
import Select from "@/components/ui/Select";
import StatusText from "@/components/ui/StatusText";
import ConfirmDialog from "@/components/business/ConfirmDialog";
import PaymentDetailsCard from "@/components/subscription/PaymentDetailsCard";
import { useRateLock } from "@/hooks/useRateLock";
import { AD_TIER_LABEL, SPONSORED_AD, adPrice, standardShare, type AdTier } from "@/lib/plans";
import { AD_KIND_LABEL, AD_STATE_LABEL, AD_STATE_TONE, adHref, adState, type AdKind } from "@/lib/ads";

type Ad = {
  _id: string; kind: AdKind; targetId?: string; targetLabel: string; weeks: number; price: number;
  paymentRef: string; status: string; startsAt?: string; endsAt?: string; reason?: string; createdAt: string;
  tier?: AdTier; city?: string; views?: number; taps?: number;
};
type Reach = { city: string; standard: number; top: number; topFreeFrom: string | null };
type Option = { _id: string; title: string };
type Data = { ads: Ad[]; business: { name: string; slug: string } | null; options: { deals: Option[]; listings: Option[] }; canPromote: boolean; reach: Reach };

const day = (d: string) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
const input = "w-full rounded-lg border border-[var(--gh-d0d7de)] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--gh-0d1117)] focus:ring-2 focus:ring-[var(--gh-0d1117)]/10";
const label = "mb-1.5 mt-4 block text-xs font-semibold text-[var(--gh-0d1117)]";

/** Business → Promote: ask for a sponsored spot on the home page, paid manually and switched on by an admin. */
export default function PromotePage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [kind, setKind] = useState<AdKind>("SHOP");
  const [targetId, setTargetId] = useState("");
  const [weeks, setWeeks] = useState<number>(SPONSORED_AD.weeks[0]);
  const [tier, setTier] = useState<AdTier>("STANDARD");
  const [paymentRef, setPaymentRef] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [sent, setSent] = useState(false);
  const [cancelling, setCancelling] = useState<Ad | null>(null);
  const [busy, setBusy] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState("");
  const lock = useRateLock("support");

  function load() {
    return fetch("/api/business/ads")
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message || "Couldn't load your ads"));
  }
  useEffect(() => { load(); }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (kind !== "SHOP" && !targetId) { setFormError(kind === "DEAL" ? "Choose a deal" : "Choose a vehicle"); return; }
    setSending(true);
    const res = await fetch("/api/business/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, targetId, weeks, tier, paymentRef, note }),
    });
    const d = await res.json().catch(() => ({}));
    setSending(false);
    if (lock.check(res, d)) return;
    if (!res.ok) { setFormError(d.error || "Couldn't send your request"); return; }
    setPaymentRef("");
    setNote("");
    setSent(true);
    load();
  }

  async function cancel() {
    if (!cancelling) return;
    setBusy(true);
    const res = await fetch(`/api/business/ads/${cancelling._id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) { setCancelling(null); load(); }
  }

  async function clearHistory() {
    setBusy(true);
    setClearError("");
    const res = await fetch("/api/business/ads", { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setClearError(d.error || "Couldn't clear the history"); return; }
    setClearing(false);
    load();
  }

  const FINISHED = ["ENDED", "REJECTED", "CANCELLED", "STOPPED"];
  const finished = data?.ads.filter(a => FINISHED.includes(adState(a))).length ?? 0;
  const choices = kind === "DEAL" ? data?.options.deals ?? [] : kind === "LISTING" ? data?.options.listings ?? [] : [];

  return (
    <div className="min-h-screen bg-[var(--gh-f6f8fa)]">
      <ConfirmDialog open={cancelling !== null} onOpenChange={o => !o && setCancelling(null)} title="Cancel this request?"
        description="The team won't run this ad. If you already paid, message the team about a refund."
        confirmLabel="Cancel request" loadingLabel="Cancelling..." loading={busy} onConfirm={cancel} />
      <ConfirmDialog open={clearing} onOpenChange={setClearing} title="Clear ad history?"
        description={`This removes ${finished} finished ad${finished !== 1 ? "s" : ""} (ended, refused, cancelled or stopped) from this list. Waiting and running ads stay.`}
        confirmLabel="Clear history" loadingLabel="Clearing..." loading={busy} error={clearError} onConfirm={clearHistory} />

      <div className="border-b border-[var(--gh-e1e4e8)] bg-white px-4 py-5 sm:px-6">
        <Link href="/business/dashboard" className="text-xs text-[var(--gh-57606a)] hover:text-[var(--gh-0d1117)]">← Dashboard</Link>
        <h1 className="mt-1 text-lg font-bold text-[var(--gh-0d1117)]">Promote</h1>
        <p className="mt-0.5 text-xs text-[var(--gh-57606a)]">Show your business, a deal or a vehicle to buyers in your city, on the home page and between Browse results</p>
      </div>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 sm:px-6">
        {error && <p role="alert" className="rounded-xl bg-[var(--gh-fff0f0)] p-3 text-sm text-[var(--gh-cf222e)]">{error}</p>}

        <ol className="grid gap-2 text-[13px] text-[var(--gh-57606a)] sm:grid-cols-3">
          {[
            `Pay PKR ${SPONSORED_AD.pricePerWeek.STANDARD.toLocaleString()} (Standard) or ${SPONSORED_AD.pricePerWeek.TOP.toLocaleString()} (Top) a week to the account below.`,
            "Send the request here with the transaction ID.",
            "The team checks the payment and puts your ad on the home page.",
          ].map((t, i) => (
            <li key={i} className="flex gap-2.5 rounded-xl border border-[var(--gh-e1e4e8)] bg-white p-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gh-0d1117)] text-[11px] font-bold text-white">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>

        <PaymentDetailsCard />

        {!data ? (
          !error && <div className="h-64 animate-pulse rounded-2xl bg-white" />
        ) : (
          <>
            {data.canPromote ? (
              <form onSubmit={send} className="rounded-2xl border border-[var(--gh-e1e4e8)] bg-white p-5">
                <p className="text-sm font-bold text-[var(--gh-0d1117)]">New ad request</p>

                <p className={label}>What to promote *</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["SHOP", "DEAL", "LISTING"] as AdKind[]).map(k => (
                    <button key={k} type="button" onClick={() => { setKind(k); setTargetId(""); }}
                      className={`rounded-lg px-2 py-2 text-[13px] font-semibold ring-1 ring-inset transition ${kind === k ? "bg-[var(--gh-0d1117)] text-white ring-[var(--gh-0d1117)]" : "bg-white text-[var(--gh-0d1117)] ring-[var(--gh-d0d7de)] hover:bg-[var(--gh-f6f8fa)]"}`}>
                      {AD_KIND_LABEL[k]}
                    </button>
                  ))}
                </div>
                {kind === "SHOP" ? (
                  <p className="mt-2 text-xs text-[var(--gh-57606a)]">Your business page{data.business ? ` (${data.business.name})` : ""} with its logo and rating.</p>
                ) : choices.length === 0 ? (
                  <p className="mt-2 text-xs text-[var(--gh-57606a)]">
                    {kind === "DEAL" ? <>You have no running deals. <Link href="/business/deals/new" className="font-semibold text-[var(--gh-0d1117)] underline">Create a deal</Link></>
                      : <>You have no active vehicles. <Link href="/sell" className="font-semibold text-[var(--gh-0d1117)] underline">List a vehicle</Link></>}
                  </p>
                ) : (
                  <div className="mt-2">
                    <Select value={targetId} onChange={setTargetId} ariaLabel={kind === "DEAL" ? "Deal" : "Vehicle"}
                      placeholder={kind === "DEAL" ? "Choose a deal" : "Choose a vehicle"}
                      options={choices.map(c => ({ value: c._id, label: c.title }))}
                      className="h-10 rounded-lg border-[var(--gh-d0d7de)] text-[13px] font-normal" />
                  </div>
                )}

                <p className={label}>Placement *</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["STANDARD", "TOP"] as AdTier[]).map(t => (
                    <button key={t} type="button" onClick={() => setTier(t)}
                      className={`rounded-lg px-3 py-2 text-left ring-1 ring-inset transition ${tier === t ? "bg-[var(--gh-0d1117)] text-white ring-[var(--gh-0d1117)]" : "bg-white text-[var(--gh-0d1117)] ring-[var(--gh-d0d7de)] hover:bg-[var(--gh-f6f8fa)]"}`}>
                      <span className="block text-[13px] font-semibold">{AD_TIER_LABEL[t]} · PKR {SPONSORED_AD.pricePerWeek[t].toLocaleString()}/week</span>
                      <span className="block text-[11px] opacity-75">{t === "TOP" ? `Always first in your city (${SPONSORED_AD.topPerCity} per city)` : "Shares the places in your city"}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[var(--gh-57606a)]">
                  {!data.reach.city
                    ? <>Your business has no city, so the ad is shown everywhere. <Link href="/business/settings" className="font-semibold text-[var(--gh-0d1117)] underline">Add your city</Link> to reach local buyers first.</>
                    : tier === "TOP"
                      ? data.reach.topFreeFrom
                        ? <>Both Top places in {data.reach.city} are taken until {day(data.reach.topFreeFrom)}. The team will start yours then, or choose Standard to start sooner.</>
                        : <>A Top place in {data.reach.city} is free: your ad shows first to every visitor there.</>
                      : (() => {
                        const n = standardShare(data.reach.standard + 1, data.reach.top);
                        return n <= 1
                          ? <>{data.reach.standard} other Standard ad{data.reach.standard === 1 ? "" : "s"} in {data.reach.city} this week: yours appears on every visit there.</>
                          : <>{data.reach.standard} other Standard ads run in {data.reach.city} this week, so yours appears in about 1 in {n} visits there.</>;
                      })()}
                </p>

                <p className={label}>How long *</p>
                <div className="grid grid-cols-3 gap-2">
                  {SPONSORED_AD.weeks.map(w => (
                    <button key={w} type="button" onClick={() => setWeeks(w)}
                      className={`rounded-lg px-2 py-2 text-center ring-1 ring-inset transition ${weeks === w ? "bg-[var(--gh-0d1117)] text-white ring-[var(--gh-0d1117)]" : "bg-white text-[var(--gh-0d1117)] ring-[var(--gh-d0d7de)] hover:bg-[var(--gh-f6f8fa)]"}`}>
                      <span className="block text-[13px] font-semibold">{w} week{w > 1 ? "s" : ""}</span>
                      <span className="block text-[11px] opacity-75">PKR {adPrice(w, tier).toLocaleString()}</span>
                    </button>
                  ))}
                </div>

                <label htmlFor="ad-ref" className={label}>Transaction ID or the number you paid from *</label>
                <input id="ad-ref" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} required minLength={3} maxLength={200}
                  placeholder="e.g. JazzCash TID 0123456789" className={input} />

                <label htmlFor="ad-note" className={label}>Note for the team</label>
                <textarea id="ad-note" value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={500}
                  placeholder="Optional, e.g. a preferred start date" className={`${input} resize-none`} />

                {formError && <p role="alert" className="mt-3 rounded-lg bg-[var(--gh-fff0f0)] px-3 py-2.5 text-[13px] text-[var(--gh-cf222e)]">{formError}</p>}
                {sent && !formError && <p role="status" className="mt-3 text-[13px] font-semibold text-emerald-600">Request sent. The team will check the payment and reply in Messages.</p>}

                <button type="submit" disabled={sending || lock.locked}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--gh-0d1117)] py-2.5 text-[13px] font-semibold text-white transition hover:bg-[var(--gh-24292f)] disabled:opacity-50 sm:w-auto sm:px-5">
                  <Send size={14} /> {lock.locked ? lock.text : sending ? "Sending…" : `Send request · PKR ${adPrice(weeks, tier).toLocaleString()}`}
                </button>
              </form>
            ) : (
              <p className="rounded-xl border border-[var(--gh-e1e4e8)] bg-white p-4 text-[13px] text-[var(--gh-57606a)]">Ask your owner or a manager to promote the business.</p>
            )}

            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-[var(--gh-0d1117)]">Your ads</p>
                {data.canPromote && finished > 0 && (
                  <button onClick={() => { setClearError(""); setClearing(true); }} className="text-xs font-semibold text-[var(--gh-57606a)] hover:text-[var(--gh-cf222e)]">Clear history</button>
                )}
              </div>
              {data.ads.length === 0 ? (
                <div className="rounded-2xl border border-[var(--gh-e1e4e8)] bg-white px-6 py-10 text-center">
                  <Megaphone size={26} strokeWidth={1.5} className="mx-auto mb-2 text-[var(--gh-8c959f)]" />
                  <p className="text-sm font-semibold text-[var(--gh-0d1117)]">No ads yet</p>
                  <p className="mt-1 text-[13px] text-[var(--gh-57606a)]">Your requests and running ads will show here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.ads.map(ad => {
                    const state = adState(ad);
                    const href = adHref(ad, data.business?.slug);
                    return (
                      <div key={ad._id} className="rounded-xl border border-[var(--gh-e1e4e8)] bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--gh-8c959f)]">{AD_KIND_LABEL[ad.kind]}</p>
                            {href ? <Link href={href} className="block truncate text-sm font-semibold text-[var(--gh-0d1117)] hover:underline">{ad.targetLabel}</Link>
                              : <p className="truncate text-sm font-semibold text-[var(--gh-0d1117)]">{ad.targetLabel}</p>}
                          </div>
                          <StatusText className={AD_STATE_TONE[state]}>{AD_STATE_LABEL[state]}</StatusText>
                        </div>
                        <p className="mt-1.5 text-xs text-[var(--gh-57606a)]">
                          {AD_TIER_LABEL[ad.tier ?? "STANDARD"]}{ad.city ? ` · ${ad.city}` : ""} · {ad.weeks} week{ad.weeks > 1 ? "s" : ""} · PKR {ad.price.toLocaleString()}
                          {ad.startsAt && ad.endsAt ? ` · ${day(ad.startsAt)} to ${day(ad.endsAt)}` : ` · asked ${day(ad.createdAt)}`}
                        </p>
                        {(state === "RUNNING" || state === "ENDED" || state === "STOPPED") && (
                          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-[var(--gh-0d1117)]">
                            <span className="inline-flex items-center gap-1"><Eye size={13} className="text-[var(--gh-8c959f)]" /> {(ad.views ?? 0).toLocaleString()} views</span>
                            <span className="inline-flex items-center gap-1"><MousePointerClick size={13} className="text-[var(--gh-8c959f)]" /> {(ad.taps ?? 0).toLocaleString()} taps</span>
                            {(ad.views ?? 0) > 0 && <span className="font-normal text-[var(--gh-57606a)]">{(((ad.taps ?? 0) / (ad.views ?? 1)) * 100).toFixed(1)}% tapped</span>}
                          </p>
                        )}
                        {ad.reason && (state === "REJECTED" || state === "STOPPED") && <p className="mt-1 text-xs text-[var(--gh-cf222e)]">{ad.reason}</p>}
                        {state === "REQUESTED" && data.canPromote && (
                          <button onClick={() => setCancelling(ad)} className="mt-2 text-xs font-semibold text-[var(--gh-57606a)] hover:text-[var(--gh-cf222e)]">Cancel request</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
