"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, ExternalLink, Fuel, RefreshCw, X } from "lucide-react";
import { Badge, PageHeader, Panel, btn } from "@/components/admin/ui";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { COMMODITY_LABEL, FUEL_LABEL, fuelDate, fuelTime, pkDayKey } from "@/lib/fuelPrices";
import type { FuelPageData } from "@/lib/publicFuel";

type Update = {
  _id: string; notificationUrl: string; fileUrl?: string; listedDay?: string; effectiveDate?: string; notificationDate?: string;
  extractedPetrolPrice?: number; extractedDieselPrice?: number; previousPetrolPrice?: number; previousDieselPrice?: number;
  approvedPetrolPrice?: number; approvedDieselPrice?: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "FAILED" | "SKIPPED"; method: "AUTO" | "MANUAL";
  extractionDetails?: { warnings?: string[]; error?: string };
  reviewNote?: string; reviewedAt?: string; reviewedBy?: { name?: string; email?: string } | null; createdAt: string; updatedAt: string;
};
type Job = { lastRunAt?: string; lastSuccessAt?: string; lastError?: string; lastResult?: string };
type Data = FuelPageData & { waiting: Update[]; reviewed: Update[]; status: { notices?: Job; oil?: Job }; config: { oilKey: boolean; gemini: boolean; cron: boolean } };

const field = "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";
const pkr = (n?: number | null) => (n == null ? "—" : `PKR ${n.toFixed(2)}`);
const usd = (n?: number | null) => (n == null ? "—" : `$${n.toFixed(2)}`);
const dayOf = (iso?: string) => (iso ? pkDayKey(new Date(iso)) : "");

/** The next daily cron: 03:00 UTC (08:00 in Pakistan). */
function nextDailyRun(now = new Date()) {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 3, 0, 0));
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

/**
 * Admin → Fuel prices (src/lib/fuelJobs.ts, src/lib/fuelAdmin.ts): releases the checker read wait here for
 * approval (with corrections) or rejection; prices can also be entered by hand with the official link. Nothing
 * reaches the public page until it is approved.
 */
export default function AdminFuelPage() {
  const canWrite = useAdminAccess().can("announcements");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { petrol: string; diesel: string; effectiveDate: string; note: string }>>({});
  const [manual, setManual] = useState({ petrol: "", diesel: "", effectiveDate: "", sourceUrl: "", note: "" });
  const [reload, setReload] = useState(0);
  const [nextRun] = useState(() => nextDailyRun());

  useEffect(() => {
    fetch("/api/admin/fuel")
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message || "Couldn't load fuel prices"));
  }, [reload]);

  const editOf = (u: Update) => edits[u._id] ?? {
    petrol: u.extractedPetrolPrice?.toFixed(2) ?? "", diesel: u.extractedDieselPrice?.toFixed(2) ?? "", effectiveDate: dayOf(u.effectiveDate), note: "",
  };
  const setEdit = (u: Update, k: "petrol" | "diesel" | "effectiveDate" | "note", v: string) => setEdits(e => ({ ...e, [u._id]: { ...editOf(u), [k]: v } }));

  async function call(key: string, url: string, method: string, body?: unknown, done?: string) {
    setBusy(key);
    setError("");
    setNotice("");
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setBusy(null);
    if (!res?.ok) { setError(d?.error || "Something went wrong. Please try again."); return false; }
    if (done) setNotice(done);
    setReload(n => n + 1);
    return true;
  }

  async function checkNow() {
    setBusy("check");
    setError("");
    setNotice("");
    const res = await fetch("/api/admin/fuel/check", { method: "POST" }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setBusy(null);
    if (!res?.ok) { setError(d?.error || "The check failed"); return; }
    if (d.skipped) { setNotice(d.skipped); return; }
    const n = d.notices?.error ? `Notices: ${d.notices.error}` : `Notices: ${d.notices?.pending ?? 0} new, ${d.notices?.failed ?? 0} couldn't be read, ${d.notices?.skipped ?? 0} unchanged`;
    const o = d.oil?.error ? `Oil: ${d.oil.error}` : `Oil: ${d.oil?.saved ?? 0} of 2 updated`;
    setNotice(`${n}. ${o}.`);
    setReload(x => x + 1);
  }

  const st = data?.status ?? {};
  return (
    <div>
      <PageHeader title="Fuel prices" description="Pakistan's official petrol and diesel prices (approved here before anyone sees them) and Brent and WTI crude."
        actions={canWrite && (
          <button type="button" onClick={checkNow} disabled={busy === "check"} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
            <RefreshCw size={14} className={busy === "check" ? "animate-spin" : ""} /> {busy === "check" ? "Checking…" : "Check now"}
          </button>
        )} />

      {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">{notice}</p>}

      {!data ? <div className="h-64 animate-pulse rounded-2xl bg-white" /> : (
        <div className="space-y-5">
          {/* Automation status */}
          <Panel title="Automation" description="The daily cron runs both checks; /api/cron/fuel can run them more often from an outside scheduler">
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
              {([["notices", "Petroleum Division notices"], ["oil", "Alpha Vantage (Brent, WTI)"]] as const).map(([k, label]) => {
                const j = st[k];
                return (
                  <div key={k} className="text-sm">
                    <p className="font-semibold text-slate-900">{label}</p>
                    <dl className="mt-1.5 space-y-1 text-[13px] text-slate-600">
                      <div><dt className="inline text-slate-400">Last check: </dt><dd className="inline">{j?.lastRunAt ? fuelTime(j.lastRunAt) : "never"}</dd></div>
                      <div><dt className="inline text-slate-400">Last success: </dt><dd className="inline">{j?.lastSuccessAt ? fuelTime(j.lastSuccessAt) : "never"}</dd></div>
                      {j?.lastResult && <div><dt className="inline text-slate-400">Result: </dt><dd className="inline">{j.lastResult}</dd></div>}
                      {j?.lastError && <div className="flex gap-1.5 text-rose-600"><AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /> {j.lastError}</div>}
                    </dl>
                  </div>
                );
              })}
              <p className="text-xs text-slate-500 sm:col-span-2">
                Next daily check: {fuelTime(nextRun)}.{" "}
                {!data.config.cron && <span className="text-rose-600">CRON_SECRET isn&apos;t set, so the daily check doesn&apos;t run. </span>}
                {!data.config.gemini && <span className="text-rose-600">GEMINI_API_KEY isn&apos;t set, so releases can&apos;t be read. </span>}
                {!data.config.oilKey && <span className="text-rose-600">ALPHA_VANTAGE_API_KEY isn&apos;t set, so oil prices aren&apos;t fetched.</span>}
              </p>
            </div>
          </Panel>

          {/* Current approved prices */}
          <div className="grid gap-4 sm:grid-cols-2">
            {(["PETROL", "DIESEL"] as const).map(t => {
              const p = data.pk[t];
              return (
                <Panel key={t} title={FUEL_LABEL[t].name}>
                  <div className="p-4 sm:p-5">
                    {p ? (
                      <>
                        <p className="text-2xl font-bold tabular-nums text-slate-900">{pkr(p.price)} <span className="text-sm font-medium text-slate-400">/ litre</span></p>
                        <p className="mt-1 text-[13px] text-slate-500">
                          w.e.f. {fuelDate(p.effectiveDate)}
                          {p.diff != null && <span className={p.diff > 0 ? " text-rose-600" : p.diff < 0 ? " text-emerald-600" : ""}> · {p.diff > 0 ? "+" : ""}{p.diff.toFixed(2)} from {pkr(p.previous)}</span>}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">Approved {fuelTime(p.approvedAt)}</p>
                      </>
                    ) : <p className="text-sm text-slate-500">No approved price yet.</p>}
                  </div>
                </Panel>
              );
            })}
          </div>

          {/* Waiting for review */}
          <Panel title={`Waiting for review (${data.waiting.length})`} description="Check each against its release image before approving. You can correct the numbers.">
            {data.waiting.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">Nothing waiting.</p> : (
              <ul className="divide-y divide-slate-100">
                {data.waiting.map(u => {
                  const e = editOf(u);
                  const failed = u.status === "FAILED";
                  return (
                    <li key={u._id} className="space-y-3 px-4 py-4 sm:px-5">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge tone={failed ? "red" : "amber"}>{failed ? "Couldn't be read" : "Waiting"}</Badge>
                        {u.listedDay && <span className="text-slate-500">Filed {fuelDate(u.listedDay)}</span>}
                        {u.notificationDate && <span className="text-slate-500">· Released {fuelDate(u.notificationDate)}</span>}
                        <a href={u.notificationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline">Notice page <ExternalLink size={11} /></a>
                        {u.fileUrl && <a href={u.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline">Release image <ExternalLink size={11} /></a>}
                      </div>
                      {u.extractionDetails?.error && <p className="text-[13px] text-rose-600">{u.extractionDetails.error}</p>}
                      {u.extractionDetails?.warnings?.map(w => <p key={w} className="flex gap-1.5 text-[13px] text-amber-700"><AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /> {w}</p>)}
                      {canWrite && (
                        <div className="grid gap-2 sm:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.5fr)]">
                          <label className="text-xs text-slate-500">Petrol (PKR/litre){u.previousPetrolPrice != null && <span className="text-slate-400"> · was {u.previousPetrolPrice}</span>}
                            <input inputMode="decimal" value={e.petrol} onChange={ev => setEdit(u, "petrol", ev.target.value)} className={`${field} mt-1`} />
                          </label>
                          <label className="text-xs text-slate-500">Diesel (PKR/litre){u.previousDieselPrice != null && <span className="text-slate-400"> · was {u.previousDieselPrice}</span>}
                            <input inputMode="decimal" value={e.diesel} onChange={ev => setEdit(u, "diesel", ev.target.value)} className={`${field} mt-1`} />
                          </label>
                          <label className="text-xs text-slate-500">Effective from
                            <input type="date" value={e.effectiveDate} onChange={ev => setEdit(u, "effectiveDate", ev.target.value)} className={`${field} mt-1`} />
                          </label>
                          <label className="text-xs text-slate-500">Note (optional)
                            <input value={e.note} maxLength={300} onChange={ev => setEdit(u, "note", ev.target.value)} className={`${field} mt-1`} placeholder="e.g. corrected diesel from the image" />
                          </label>
                        </div>
                      )}
                      {canWrite && (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" disabled={busy === u._id} onClick={() => call(u._id, `/api/admin/fuel/${u._id}`, "PATCH", { action: "approve", ...e }, "Approved. The new prices are on the public page.")}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"><Check size={13} /> Approve</button>
                          <button type="button" disabled={busy === u._id} onClick={() => call(u._id, `/api/admin/fuel/${u._id}`, "PATCH", { action: "reject", note: e.note }, "Rejected.")}
                            className={`${btn.base} ${btn.danger}`}><X size={13} /> Reject</button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {/* Manual entry */}
          {canWrite && (
            <Panel title="Enter prices by hand" description="When a release can't be read. Always link the official notification.">
              <form onSubmit={async ev => { ev.preventDefault(); if (await call("manual", "/api/admin/fuel", "POST", manual, "Saved and published.")) setManual({ petrol: "", diesel: "", effectiveDate: "", sourceUrl: "", note: "" }); }}
                className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,2fr)]">
                <label className="text-xs text-slate-500">Petrol (PKR/litre)<input required inputMode="decimal" value={manual.petrol} onChange={e => setManual(m => ({ ...m, petrol: e.target.value }))} className={`${field} mt-1`} /></label>
                <label className="text-xs text-slate-500">Diesel (PKR/litre)<input required inputMode="decimal" value={manual.diesel} onChange={e => setManual(m => ({ ...m, diesel: e.target.value }))} className={`${field} mt-1`} /></label>
                <label className="text-xs text-slate-500">Effective from<input required type="date" value={manual.effectiveDate} onChange={e => setManual(m => ({ ...m, effectiveDate: e.target.value }))} className={`${field} mt-1`} /></label>
                <label className="text-xs text-slate-500">Official notification link<input required type="url" placeholder="https://petroleum.gov.pk/NewsDetail/…" value={manual.sourceUrl} onChange={e => setManual(m => ({ ...m, sourceUrl: e.target.value }))} className={`${field} mt-1`} /></label>
                <label className="text-xs text-slate-500 sm:col-span-2 lg:col-span-3">Note (optional)<input maxLength={300} value={manual.note} onChange={e => setManual(m => ({ ...m, note: e.target.value }))} className={`${field} mt-1`} /></label>
                <div className="flex items-end"><button type="submit" disabled={busy === "manual"} className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{busy === "manual" ? "Saving…" : "Save and publish"}</button></div>
              </form>
            </Panel>
          )}

          {/* International market */}
          <Panel title="International market" description={data.oilUpdatedAt ? `Last successful update ${fuelTime(data.oilUpdatedAt)} · daily closes from Alpha Vantage (U.S. EIA data, a few days behind)` : "Not fetched yet"}>
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
              {(["BRENT", "WTI"] as const).map(c => {
                const q = data.oil[c];
                return (
                  <div key={c}>
                    <p className="text-sm font-semibold text-slate-900">{COMMODITY_LABEL[c]} <span className="font-normal text-slate-400">{q?.symbol}</span></p>
                    {q ? (
                      <>
                        <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{usd(q.price)} <span className="text-sm font-medium text-slate-400">/ barrel</span></p>
                        <p className="text-xs text-slate-500">{q.change != null && `${q.change > 0 ? "+" : ""}${q.change.toFixed(2)} (${q.percentChange?.toFixed(2)}%) · `}close on {fuelDate(q.marketTimestamp)} · {data.oilHistory[c].length} days of history</p>
                      </>
                    ) : <p className="mt-1 text-sm text-slate-500">No data yet.</p>}
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* History */}
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <Panel title="Pakistan price history" description="Approved prices, newest first">
              {data.pkHistory.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">No approved prices yet.</p> : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-slate-400"><th className="px-4 py-2 font-medium sm:px-5">Effective</th><th className="px-2 py-2 font-medium">Petrol</th><th className="px-2 py-2 font-medium">Diesel</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...data.pkHistory].reverse().slice(0, 20).map(d => (
                      <tr key={d.date}><td className="px-4 py-2 text-slate-600 sm:px-5">{fuelDate(d.date)}</td><td className="px-2 py-2 tabular-nums">{d.petrol?.toFixed(2) ?? "—"}</td><td className="px-2 py-2 tabular-nums">{d.diesel?.toFixed(2) ?? "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
            <Panel title="Recently reviewed" description="The audit trail of approvals, rejections and skipped releases">
              {data.reviewed.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">Nothing reviewed yet.</p> : (
                <ul className="divide-y divide-slate-100">
                  {data.reviewed.map(u => (
                    <li key={u._id} className="px-4 py-3 text-[13px] sm:px-5">
                      <p className="flex flex-wrap items-center gap-2">
                        <Badge tone={u.status === "APPROVED" ? "green" : u.status === "REJECTED" ? "red" : "neutral"}>{u.status === "SKIPPED" ? "Unchanged" : u.status === "APPROVED" ? (u.method === "MANUAL" ? "Entered" : "Approved") : "Rejected"}</Badge>
                        {u.effectiveDate && <span className="text-slate-600">w.e.f. {fuelDate(u.effectiveDate)}</span>}
                        <span className="tabular-nums text-slate-900">Petrol {(u.approvedPetrolPrice ?? u.extractedPetrolPrice)?.toFixed(2) ?? "—"} · Diesel {(u.approvedDieselPrice ?? u.extractedDieselPrice)?.toFixed(2) ?? "—"}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {u.reviewedBy?.name || u.reviewedBy?.email ? `${u.reviewedBy?.name || u.reviewedBy?.email}, ` : ""}{fuelTime(u.reviewedAt ?? u.updatedAt)}
                        {u.reviewNote && ` · ${u.reviewNote}`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
      <p className="mt-6 flex items-center gap-1.5 text-xs text-slate-400"><Fuel size={13} /> The public page is /fuel-prices. Releases come from petroleum.gov.pk; oil prices from Alpha Vantage.</p>
    </div>
  );
}
