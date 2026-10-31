"use client";

import { useEffect, useState } from "react";
import { refreshAdminCounts } from "@/lib/adminCounts";
import * as Dialog from "@radix-ui/react-dialog";
import { ExternalLink, Rocket, Trash2, X } from "lucide-react";
import { Badge, ConfirmDialog, PageHeader, Panel, Segmented, btn } from "@/components/admin/ui";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import StatusText from "@/components/ui/StatusText";
import { SPONSORED_AD, AD_TIER_LABEL, type AdTier } from "@/lib/plans";
import { AD_KIND_LABEL, AD_STATE_LABEL, AD_STATE_TONE, DAY_MS, adHref, adState, type AdKind } from "@/lib/ads";

type AdminAd = {
  _id: string; kind: AdKind; targetId?: string; targetLabel: string; weeks: number; price: number;
  paymentRef: string; note?: string; status: string; startsAt?: string; endsAt?: string; reason?: string;
  createdAt: string; handledAt?: string;
  tier?: AdTier; city?: string; views?: number; taps?: number;
  business: { name: string; slug: string; isActive?: boolean } | null;
  requester: { name?: string; email: string } | null;
  handler: { name?: string; email: string } | null;
};
type Tab = "REQUESTED" | "LIVE" | "PAST";
type Action = "approve" | "reject" | "stop";

const fmt = (d: string | number) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
/** Today in Pakistan as YYYY-MM-DD, for the start date picker */
const todayPk = () => new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** Admin queue of sponsored ad requests: check the payment, then approve, refuse, or stop a running ad. */
export default function AdminAdsPage() {
  // What this admin's role may do here (src/lib/adminRoles.ts)
  const canWrite = useAdminAccess().can("ads");
  const [tab, setTab] = useState<Tab>("REQUESTED");
  const [ads, setAds] = useState<AdminAd[] | null>(null);
  const [counts, setCounts] = useState({ waiting: 0, running: 0 });
  const [acting, setActing] = useState<{ ad: AdminAd; action: Action; today: string; at: number } | null>(null);
  const [start, setStart] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [clearing, setClearing] = useState(false);

  function load(t: Tab) {
    return fetch(`/api/admin/ads?tab=${t}`)
      .then(r => r.json())
      .then(d => { setAds(d.ads ?? []); setCounts({ waiting: d.waiting ?? 0, running: d.running ?? 0 }); refreshAdminCounts({ ads: d.waiting ?? 0 }); })
      .catch(() => setAds([]));
  }
  useEffect(() => { load(tab); }, [tab]);

  function open(ad: AdminAd, action: Action) {
    const today = todayPk();
    setStart(today);
    setReason("");
    setError("");
    setActing({ ad, action, today, at: new Date(`${today}T00:00:00+05:00`).getTime() });
  }

  async function submit() {
    if (!acting) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/ads/${acting.ad._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: acting.action, startsAt: start === acting.today ? undefined : start, reason }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(d.error || "Couldn't update the ad"); return; }
    setActing(null);
    load(tab);
  }

  async function clearHistory() {
    setBusy(true);
    const res = await fetch("/api/admin/ads", { method: "DELETE" });
    setBusy(false);
    if (res.ok) { setClearing(false); load(tab); }
  }

  const endPreview = acting?.action === "approve" && start
    ? fmt(Math.max(new Date(`${start}T00:00:00+05:00`).getTime(), acting.at) + acting.ad.weeks * 7 * DAY_MS)
    : "";

  return (
    <div>
      <PageHeader title="Ad requests"
        description={`Businesses pay PKR ${SPONSORED_AD.pricePerWeek.STANDARD.toLocaleString()} (Standard) or ${SPONSORED_AD.pricePerWeek.TOP.toLocaleString()} (Top) a week. Ads are shown in their business's city first; Standard ads rotate, Top ads are first (${SPONSORED_AD.topPerCity} per city). ${counts.running} running now. Check the payment arrived, then approve.`} />

      <ConfirmDialog open={clearing} onOpenChange={setClearing} title="Clear ad history?" tone="danger" icon={Trash2}
        description="Removes every finished ad (ended, refused, cancelled or stopped) from the Past tab. Businesses keep their own copy until they clear it, and approvals stay in the activity log."
        confirmLabel="Clear history" loadingLabel="Clearing…" loading={busy} onConfirm={clearHistory} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Segmented<Tab>
          value={tab}
          onChange={t => { setAds(null); setTab(t); }}
          options={[
            { value: "REQUESTED", label: <>Requests {counts.waiting > 0 && <span className="rounded-full bg-rose-600 px-1.5 text-[11px] font-bold text-white">{counts.waiting}</span>}</> },
            { value: "LIVE", label: "Running & upcoming" },
            { value: "PAST", label: "Past" },
          ]}
        />
        {tab === "PAST" && canWrite && ads && ads.length > 0 && (
          <button onClick={() => setClearing(true)} className={`${btn.base} ${btn.danger}`}><Trash2 size={13} /> Clear history</button>
        )}
      </div>

      {ads === null ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />)}</div>
      ) : ads.length === 0 ? (
        <Panel>
          <div className="px-6 py-14 text-center">
            <Rocket size={28} strokeWidth={1.5} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-900">{tab === "REQUESTED" ? "No requests waiting" : tab === "LIVE" ? "No ads running" : "Nothing here yet"}</p>
            <p className="mt-1 text-[13px] text-slate-500">{tab === "REQUESTED" ? "When a business asks for a sponsored ad from Business → Promote, it shows up here." : ""}</p>
          </div>
        </Panel>
      ) : (
        <div className="grid items-start gap-3 xl:grid-cols-2">
          {ads.map(ad => {
            const state = adState(ad);
            const view = adHref(ad, ad.business?.slug);
            return (
              <div key={ad._id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {AD_KIND_LABEL[ad.kind]}
                        {ad.business && <span className="normal-case tracking-normal">· {ad.business.name}</span>}
                        {ad.business?.isActive === false && <Badge tone="red">Suspended</Badge>}
                      </p>
                      {view ? (
                        <a href={view} target="_blank" rel="noreferrer" className="mt-0.5 flex min-w-0 items-center gap-1 text-[15px] font-bold text-slate-900 hover:underline">
                          <span className="truncate">{ad.targetLabel}</span> <ExternalLink size={12} className="flex-shrink-0 text-slate-400" />
                        </a>
                      ) : (
                        <p className="mt-0.5 truncate text-[15px] font-bold text-slate-900">{ad.targetLabel}</p>
                      )}
                    </div>
                    <StatusText className={AD_STATE_TONE[state]}>{AD_STATE_LABEL[state]}</StatusText>
                  </div>
                  <p className="mt-2 text-[13px] text-slate-700">
                    <strong className="font-semibold">PKR {ad.price.toLocaleString()}</strong> · {AD_TIER_LABEL[ad.tier ?? "STANDARD"]} · {ad.city || "All cities"} · {ad.weeks} week{ad.weeks > 1 ? "s" : ""}
                    {ad.startsAt && ad.endsAt && <> · {fmt(ad.startsAt)} to {fmt(ad.endsAt)}</>}
                  </p>
                  {(ad.views ?? 0) > 0 && (
                    <p className="mt-1 text-[13px] text-slate-500">{(ad.views ?? 0).toLocaleString()} views · {(ad.taps ?? 0).toLocaleString()} taps</p>
                  )}
                  <p className="mt-1 text-[13px] text-slate-700"><span className="text-slate-500">Payment:</span> <span className="font-semibold">{ad.paymentRef}</span></p>
                  {ad.note && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[13px] leading-relaxed text-slate-700">“{ad.note}”</p>}
                  {ad.reason && <p className="mt-2 text-[12px] text-rose-600">{ad.reason}</p>}
                  <p className="mt-2 text-[11px] text-slate-500">
                    Asked by {ad.requester ? (ad.requester.name || ad.requester.email) : "a deleted account"} · {fmt(ad.createdAt)}
                    {ad.handler && <> · handled by {ad.handler.name || ad.handler.email}</>}
                  </p>
                </div>
                {canWrite && (state === "REQUESTED" || state === "RUNNING" || state === "SCHEDULED") && (
                  <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-slate-100 px-4 py-2.5">
                    {state === "REQUESTED" ? (
                      <>
                        <button onClick={() => open(ad, "reject")} className={`${btn.base} ${btn.secondary}`}>Refuse</button>
                        <button onClick={() => open(ad, "approve")} className={`${btn.base} bg-slate-900 text-white hover:bg-slate-800`}>Payment received, approve</button>
                      </>
                    ) : (
                      <button onClick={() => open(ad, "stop")} className={`${btn.base} ${btn.danger}`}>Stop ad</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog.Root open={acting !== null} onOpenChange={o => !busy && !o && setActing(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[1000] bg-slate-950/50 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] w-[calc(100%-32px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Dialog.Title className="text-base font-semibold text-slate-900">
                  {acting?.action === "approve" ? "Approve ad" : acting?.action === "reject" ? "Refuse request" : "Stop ad"}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-slate-500">
                  {acting?.action === "approve"
                    ? `Only approve once PKR ${acting.ad.price.toLocaleString()} has arrived (${acting.ad.paymentRef}). The business is told in Messages.`
                    : "The business sees this reason in Messages and on its Promote page."}
                </Dialog.Description>
              </div>
              <Dialog.Close aria-label="Close" className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></Dialog.Close>
            </div>
            <form onSubmit={e => { e.preventDefault(); submit(); }} className="mt-4 space-y-3">
              {acting?.action === "approve" ? (
                <label className="block text-[13px] font-medium text-slate-700">
                  Starts on
                  <input type="date" value={start} min={acting.today} onChange={e => setStart(e.target.value)} required
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-900" />
                  {endPreview && <span className="mt-1 block text-xs text-slate-500">Runs {acting.ad.weeks} week{acting.ad.weeks > 1 ? "s" : ""}, until {endPreview}</span>}
                </label>
              ) : (
                <input value={reason} onChange={e => setReason(e.target.value)} maxLength={500} autoFocus required
                  placeholder={acting?.action === "reject" ? 'e.g. "Payment not received"' : 'e.g. "Vehicle reported as sold"'}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-900" aria-label="Reason" />
              )}
              {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
              <div className="flex justify-end gap-2">
                <Dialog.Close asChild><button type="button" disabled={busy} className={`${btn.base} ${btn.secondary} px-4 py-2`}>Cancel</button></Dialog.Close>
                <button type="submit" disabled={busy} className={`${btn.base} px-4 py-2 text-white ${acting?.action === "approve" ? "bg-slate-900 hover:bg-slate-800" : "bg-rose-600 hover:bg-rose-700"}`}>
                  {busy ? "Saving…" : acting?.action === "approve" ? "Approve" : acting?.action === "reject" ? "Refuse" : "Stop ad"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
