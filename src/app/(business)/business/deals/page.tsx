"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, ImageOff, MapPin, Pause, Pencil, Play, Plus, Tag, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/business/ConfirmDialog";
import { formatLakh } from "@/lib/format";
import { DEAL_STATE_STYLE, dealLabel, dealPrice, dealState, type DealState } from "@/lib/deals";

type Deal = {
  _id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  location: string;
  images: string[];
  price: number;
  discountType: "PERCENT" | "AMOUNT";
  discountValue: number;
  startsAt: string;
  endsAt: string;
  paused: boolean;
  disabledByAdmin: boolean;
  createdBy?: { name?: string } | null;
};

const fmt = (d: string) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
const TABS: Array<{ value: "ALL" | DealState; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "LIVE", label: "Live" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "PAUSED", label: "Paused" },
  { value: "EXPIRED", label: "Ended" },
];

export default function BusinessDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Deal | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"ALL" | DealState>("ALL");
  const [now, setNow] = useState(0);

  const load = () =>
    fetch("/api/business/deals")
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load deals");
        setDeals(d.deals || []);
        setCanManage(!!d.permissions?.canManage);
        setNow(Date.now());
      })
      .catch(e => setPageError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  async function togglePause(d: Deal) {
    setBusy(d._id);
    setPageError("");
    const res = await fetch(`/api/business/deals/${d._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paused: !d.paused }) });
    setBusy(null);
    if (!res.ok) setPageError((await res.json().catch(() => ({}))).error || "Failed to update deal");
    load();
  }

  async function remove() {
    const d = confirmDelete;
    if (!d) return;
    setBusy(d._id);
    const res = await fetch(`/api/business/deals/${d._id}`, { method: "DELETE" });
    setBusy(null);
    setConfirmDelete(null);
    if (!res.ok) setPageError((await res.json().catch(() => ({}))).error || "Failed to delete deal");
    load();
  }

  const stateOf = (d: Deal): DealState => (now ? dealState(d, now) : "LIVE");
  const count = (s: "ALL" | DealState) => (s === "ALL" ? deals.length : deals.filter(d => stateOf(d) === s).length);
  const shown = tab === "ALL" ? deals : deals.filter(d => stateOf(d) === tab);

  return (
    <div className="min-h-screen bg-[var(--gh-f6f8fa)]">
      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={o => !o && setConfirmDelete(null)}
        title={`Delete "${confirmDelete?.title ?? "deal"}"`}
        description="The deal and its page disappear from AutoMarket straight away. This can't be undone."
        confirmLabel="Delete deal"
        loading={confirmDelete !== null && busy === confirmDelete._id}
        onConfirm={remove}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--gh-e1e4e8)] bg-white px-4 py-5 sm:px-6">
        <div>
          <Link href="/business/dashboard" className="text-xs text-[var(--gh-57606a)] hover:text-[var(--gh-0d1117)]">← Dashboard</Link>
          <h1 className="mt-1 text-lg font-bold text-[var(--gh-0d1117)]">Deals</h1>
          <p className="mt-0.5 text-xs text-[var(--gh-57606a)]">Special offers with their own photos, shown on the Deals page and your business page · {count("LIVE")} live now</p>
        </div>
        <div className="flex gap-2">
          <Link href="/deals" target="_blank" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-3 py-2.5 text-[13px] font-semibold text-[var(--gh-0d1117)] hover:bg-[var(--gh-f6f8fa)]">
            <ExternalLink size={14} /> Deals page
          </Link>
          {canManage && (
            <Link href="/business/deals/new" className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-rose-700">
              <Plus size={15} /> New deal
            </Link>
          )}
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6">
        {pageError && <div role="alert" className="mb-4 rounded-xl border border-[var(--gh-ffcdd2)] bg-[var(--gh-fff0f0)] px-4 py-3 text-[13px] text-[var(--gh-cf222e)]">{pageError}</div>}

        {deals.length > 0 && (
          <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
            {TABS.map(t => (
              <button key={t.value} onClick={() => setTab(t.value)} aria-pressed={tab === t.value}
                className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${tab === t.value ? "bg-[var(--gh-0d1117)] text-white ring-[var(--gh-0d1117)]" : "bg-white text-[var(--gh-57606a)] ring-[var(--gh-e1e4e8)] hover:text-[var(--gh-0d1117)]"}`}>
                {t.label} <span className="opacity-60">{count(t.value)}</span>
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map(i => <div key={i} className="h-80 animate-pulse rounded-2xl bg-white" />)}</div>
        ) : deals.length === 0 ? (
          <div className="rounded-2xl border border-[var(--gh-e1e4e8)] bg-white px-6 py-14 text-center">
            <div className="mb-3 flex justify-center text-rose-500"><Tag size={30} strokeWidth={1.5} /></div>
            <p className="text-sm font-semibold text-[var(--gh-0d1117)]">No deals yet</p>
            <p className="mx-auto mt-1 max-w-[420px] text-[13px] text-[var(--gh-57606a)]">
              Create a special offer with its own photos, price and end date. It appears on the Deals page and your business page.
            </p>
            {canManage && (
              <Link href="/business/deals/new" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-rose-700">
                <Plus size={15} /> Create your first deal
              </Link>
            )}
          </div>
        ) : shown.length === 0 ? (
          <p className="rounded-2xl border border-[var(--gh-e1e4e8)] bg-white px-6 py-10 text-center text-[13px] text-[var(--gh-57606a)]">No deals here.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map(d => {
              const state = stateOf(d);
              const st = DEAL_STATE_STYLE[state];
              return (
                <div key={d._id} className="flex flex-col overflow-hidden rounded-2xl border border-[var(--gh-e1e4e8)] bg-white">
                  <div className="relative aspect-[16/10] bg-[var(--gh-f6f8fa)]">
                    {d.images[0] ? (
                      <Image src={d.images[0]} alt={d.title} fill sizes="(max-width: 640px) 100vw, 380px" className={`object-cover ${state === "LIVE" || state === "SCHEDULED" ? "" : "opacity-60 grayscale"}`} />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[var(--gh-8c959f)]"><ImageOff size={26} /></span>
                    )}
                    <span className="theme-static absolute left-2 top-2 rounded-full bg-gradient-to-r from-rose-600 to-orange-500 px-2.5 py-1 text-[11px] font-extrabold uppercase text-white">{dealLabel(d)}</span>
                    <span className="absolute right-2 top-2 rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--gh-8c959f)]">{d.make} {d.model} · {d.year}</p>
                    <p className="mt-0.5 line-clamp-2 font-semibold text-[var(--gh-0d1117)]">{d.title}</p>
                    <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
                      <span className="text-lg font-extrabold text-rose-600">PKR {formatLakh(dealPrice(d.price, d))}</span>
                      <span className="text-xs text-[var(--gh-8c959f)] line-through">{formatLakh(d.price)}</span>
                    </p>
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-[var(--gh-57606a)]"><MapPin size={12} /> {d.location} · {fmt(d.startsAt)} → {fmt(d.endsAt)}</p>
                    {state === "DISABLED" && <p className="mt-2 text-xs font-semibold text-[var(--gh-cf222e)]">An AutoMarket admin switched this deal off. Contact the team if you think that&apos;s a mistake.</p>}
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                      <Link href={`/deals/${d._id}`} target="_blank" className="inline-flex items-center gap-1 rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--gh-0d1117)]">
                        <ExternalLink size={12} /> View
                      </Link>
                      {canManage && (
                        <>
                          <Link href={`/business/deals/${d._id}/edit`} className="inline-flex items-center gap-1 rounded-lg border border-[var(--gh-e1e4e8)] bg-[var(--gh-f6f8fa)] px-2.5 py-1.5 text-xs font-semibold text-[var(--gh-0d1117)]">
                            <Pencil size={12} /> Edit
                          </Link>
                          {!d.disabledByAdmin && state !== "EXPIRED" && (
                            <button onClick={() => togglePause(d)} disabled={busy === d._id} className="inline-flex items-center gap-1 rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--gh-0d1117)] disabled:opacity-50">
                              {d.paused ? <><Play size={12} /> Resume</> : <><Pause size={12} /> Pause</>}
                            </button>
                          )}
                          <button onClick={() => setConfirmDelete(d)} disabled={busy === d._id} className="inline-flex items-center gap-1 rounded-lg border border-[var(--gh-ffcdd2)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--gh-cf222e)] disabled:opacity-50">
                            <Trash2 size={12} /> Delete
                          </button>
                        </>
                      )}
                    </div>
                    {d.createdBy?.name && <p className="mt-2 text-[10px] text-[var(--gh-8c959f)]">Created by {d.createdBy.name}</p>}
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
