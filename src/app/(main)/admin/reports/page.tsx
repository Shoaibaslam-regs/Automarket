"use client";

import { useEffect, useState } from "react";
import { refreshAdminCounts } from "@/lib/adminCounts";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, ExternalLink, Flag, X } from "lucide-react";
import { Badge, PageHeader, Panel, Segmented, btn, type Tone } from "@/components/admin/ui";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { REPORT_REASON_LABEL, REPORT_TARGET_LABEL, reportTargetHref } from "@/lib/reports";

type AdminReport = {
  _id: string;
  targetType: "LISTING" | "DEAL" | "BUSINESS";
  targetId: string;
  targetLabel: string;
  reason: string;
  details?: string;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  resolution?: string;
  createdAt: string;
  handledAt?: string;
  reporter: { name?: string; email: string } | null;
  handler: { name?: string; email: string } | null;
  business: { name: string; slug: string; isActive?: boolean } | null;
  openForTarget: number;
};

type Status = "OPEN" | "RESOLVED" | "DISMISSED";
const REASON_TONE: Record<string, Tone> = { SCAM: "red", FAKE: "red", WRONG_INFO: "amber", UNAVAILABLE: "neutral", OFFENSIVE: "violet", OTHER: "neutral" };
const fmt = (d: string) => new Date(d).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Where an admin goes to act on a reported item (remove a listing, switch off a deal, warn or suspend a business). */
function actHref(r: AdminReport) {
  if (r.targetType === "LISTING") return { href: "/admin/listings", label: "Go to Listings" };
  if (r.targetType === "DEAL") return { href: "/admin/deals", label: "Go to Deals" };
  return { href: "/admin", label: "Go to Businesses" };
}

/** Admin queue of user reports about listings, deals and businesses. */
export default function AdminReportsPage() {
  // What this admin's role may do here (src/lib/adminRoles.ts)
  const canWrite = useAdminAccess().can("reports");
  const [status, setStatus] = useState<Status>("OPEN");
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [open, setOpen] = useState(0);
  const [closing, setClosing] = useState<{ report: AdminReport; action: "resolve" | "dismiss" } | null>(null);
  const [note, setNote] = useState("");
  const [allSimilar, setAllSimilar] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function load(s: Status) {
    return fetch(`/api/admin/reports?status=${s}`)
      .then(r => r.json())
      .then(d => { setReports(d.reports ?? []); setOpen(d.open ?? 0); refreshAdminCounts({ reports: d.open ?? 0 }); })
      .catch(() => setReports([]));
  }
  useEffect(() => { load(status); }, [status]);

  async function close() {
    if (!closing) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/reports/${closing.report._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: closing.action, note, alsoSimilar: allSimilar }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(d.error || "Couldn't update the report"); return; }
    setClosing(null);
    load(status);
  }

  return (
    <div>
      <PageHeader title="Reports" description="What users flagged as scams, fakes or wrong details. Check the item, act on it, then close the report." />

      <div className="mb-4">
        <Segmented<Status>
          value={status}
          onChange={s => { setReports(null); setStatus(s); }}
          options={[
            { value: "OPEN", label: <>Open {open > 0 && <span className="rounded-full bg-rose-600 px-1.5 text-[11px] font-bold text-white">{open}</span>}</> },
            { value: "RESOLVED", label: "Resolved" },
            { value: "DISMISSED", label: "Dismissed" },
          ]}
        />
      </div>

      {reports === null ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />)}</div>
      ) : reports.length === 0 ? (
        <Panel>
          <div className="px-6 py-14 text-center">
            <Flag size={28} strokeWidth={1.5} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-900">{status === "OPEN" ? "No open reports" : "Nothing here yet"}</p>
            <p className="mt-1 text-[13px] text-slate-500">{status === "OPEN" ? "When users report a listing, deal or business, it shows up here." : ""}</p>
          </div>
        </Panel>
      ) : (
        <div className="grid items-start gap-3 xl:grid-cols-2">
          {reports.map(r => {
            const view = reportTargetHref({ targetType: r.targetType, targetId: r.targetId, slug: r.business?.slug });
            const act = actHref(r);
            return (
              <div key={r._id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {REPORT_TARGET_LABEL[r.targetType]}
                        {r.business && r.targetType !== "BUSINESS" && <span className="normal-case tracking-normal">· {r.business.name}</span>}
                        {r.business?.isActive === false && <Badge tone="red">Suspended</Badge>}
                      </p>
                      {view ? (
                        <a href={view} target="_blank" rel="noreferrer" className="mt-0.5 flex min-w-0 items-center gap-1 text-[15px] font-bold text-slate-900 hover:underline">
                          <span className="truncate">{r.targetLabel}</span> <ExternalLink size={12} className="flex-shrink-0 text-slate-400" />
                        </a>
                      ) : (
                        <p className="mt-0.5 truncate text-[15px] font-bold text-slate-900">{r.targetLabel}</p>
                      )}
                    </div>
                    <Badge tone={REASON_TONE[r.reason] ?? "neutral"}>{REPORT_REASON_LABEL[r.reason] ?? r.reason}</Badge>
                  </div>
                  {r.details && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[13px] leading-relaxed text-slate-700">“{r.details}”</p>}
                  <p className="mt-2 text-[11px] text-slate-500">
                    By {r.reporter ? (r.reporter.name || r.reporter.email) : "a deleted account"} · {fmt(r.createdAt)}
                    {r.status === "OPEN" && r.openForTarget > 1 && <span className="ml-1 font-semibold text-rose-600">· {r.openForTarget} open reports on this item</span>}
                  </p>
                  {r.status !== "OPEN" && (
                    <p className="mt-2 flex items-start gap-1.5 text-[12px] text-slate-600">
                      <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                      <span>{r.status === "RESOLVED" ? "Resolved" : "Dismissed"}{r.handler ? ` by ${r.handler.name || r.handler.email}` : ""}{r.handledAt ? ` · ${fmt(r.handledAt)}` : ""}{r.resolution ? ` — ${r.resolution}` : ""}</span>
                    </p>
                  )}
                </div>
                {r.status === "OPEN" && (
                  <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-4 py-2.5">
                    <Link href={act.href} className={`${btn.base} ${btn.secondary}`}>{act.label}</Link>
                    {canWrite && (
                      <span className="ml-auto flex gap-1.5">
                        <button onClick={() => { setNote(""); setAllSimilar(true); setError(""); setClosing({ report: r, action: "dismiss" }); }} className={`${btn.base} ${btn.secondary}`}>Dismiss</button>
                        <button onClick={() => { setNote(""); setAllSimilar(true); setError(""); setClosing({ report: r, action: "resolve" }); }} className={`${btn.base} bg-slate-900 text-white hover:bg-slate-800`}>Resolve</button>
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog.Root open={closing !== null} onOpenChange={o => !busy && !o && setClosing(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[1000] bg-slate-950/50 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] w-[calc(100%-32px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Dialog.Title className="text-base font-semibold text-slate-900">{closing?.action === "resolve" ? "Resolve report" : "Dismiss report"}</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-slate-500">
                  {closing?.action === "resolve" ? "Say what you did about it. This goes into the admin activity log." : "Nothing was wrong with it. Add a note if useful."}
                </Dialog.Description>
              </div>
              <Dialog.Close aria-label="Close" className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></Dialog.Close>
            </div>
            <form onSubmit={e => { e.preventDefault(); close(); }} className="mt-4 space-y-3">
              <input value={note} onChange={e => setNote(e.target.value)} maxLength={500} autoFocus
                placeholder={closing?.action === "resolve" ? 'e.g. "Listing removed, seller warned"' : "Note (optional)"}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-900" aria-label="Note" />
              {closing && closing.report.openForTarget > 1 && (
                <label className="flex items-center gap-2 text-[13px] text-slate-700">
                  <input type="checkbox" checked={allSimilar} onChange={e => setAllSimilar(e.target.checked)} className="h-4 w-4 accent-slate-900" />
                  Also close the other {closing.report.openForTarget - 1} open report{closing.report.openForTarget > 2 ? "s" : ""} on this item
                </label>
              )}
              {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
              <div className="flex justify-end gap-2">
                <Dialog.Close asChild><button type="button" disabled={busy} className={`${btn.base} ${btn.secondary} px-4 py-2`}>Cancel</button></Dialog.Close>
                <button type="submit" disabled={busy} className={`${btn.base} bg-slate-900 px-4 py-2 text-white hover:bg-slate-800`}>{busy ? "Saving…" : closing?.action === "resolve" ? "Resolve" : "Dismiss"}</button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
