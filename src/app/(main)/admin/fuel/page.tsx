"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, ExternalLink, Fuel, Pencil, RefreshCw, Trash2, X } from "lucide-react";
import { Badge, ConfirmDialog, PageHeader, Panel, btn } from "@/components/admin/ui";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { FUEL_LABEL, fuelDate, fuelTime, pkDayKey } from "@/lib/fuelPrices";
import type { FuelPageData } from "@/lib/publicFuel";

type Update = {
  _id: string; notificationUrl: string; fileUrl?: string; listedDay?: string; effectiveDate?: string; notificationDate?: string;
  extractedPetrolPrice?: number; extractedDieselPrice?: number; previousPetrolPrice?: number; previousDieselPrice?: number;
  approvedPetrolPrice?: number; approvedDieselPrice?: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "FAILED" | "SKIPPED"; method: "AUTO" | "MANUAL";
  extractionDetails?: { warnings?: string[]; error?: string; held?: string };
  autoPublished?: boolean;
  reviewNote?: string; reviewedAt?: string; reviewedBy?: { name?: string; email?: string } | null; createdAt: string; updatedAt: string;
};
type Job = { lastRunAt?: string; lastSuccessAt?: string; lastError?: string; lastResult?: string };
type Data = FuelPageData & { waiting: Update[]; reviewed: Update[]; status: { notices?: Job; oil?: Job }; config: { gemini: boolean; cron: boolean }; olderHistory: { days: number; keepDays: number } };

const field = "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";
const pkr = (n?: number | null) => (n == null ? "—" : `PKR ${n.toFixed(2)}`);
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
  // A published day being corrected, or about to be removed
  const [editing, setEditing] = useState<{ day: string; petrol: string; diesel: string; effectiveDate: string; note: string } | null>(null);
  const [removing, setRemoving] = useState<{ day: string; note: string } | null>(null);
  const [clearing, setClearing] = useState(false);
  const [pruning, setPruning] = useState(false);
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
    const n = d.notices?.error ? `Notices: ${d.notices.error}` : `Prices: ${d.notices?.published ? `${d.notices.published} published automatically, ` : ""}${d.notices?.pending ?? 0} waiting for review, ${d.notices?.failed ?? 0} couldn't be read, ${d.notices?.skipped ?? 0} unchanged`;
    setNotice(`${n}.`);
    setReload(x => x + 1);
  }

  const st = data?.status ?? {};
  return (
    <div>
      <PageHeader title="Fuel prices" description="Pakistan's official petrol and diesel prices (approved here before anyone sees them)."
        actions={canWrite && (
          <button type="button" onClick={checkNow} disabled={busy === "check"} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
            <RefreshCw size={14} className={busy === "check" ? "animate-spin" : ""} /> {busy === "check" ? "Checking…" : "Check now"}
          </button>
        )} />

      {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">{notice}</p>}

      {!data ? <div className="h-64 animate-pulse rounded-xl bg-white" /> : (
        <div className="space-y-5">
          {/* Automation status */}
          <Panel title="Automation" description="The daily cron runs the check; /api/cron/fuel can run it more often from an outside scheduler">
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
              {([["notices", "Pakistan prices (OGRA)"]] as const).map(([k, label]) => {
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
                {!data.config.gemini && <span className="text-rose-600">GEMINI_API_KEY isn&apos;t set, so the fallback Petroleum Division images can&apos;t be read. </span>}
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
          <Panel title={`Waiting for review (${data.waiting.length})`} description="OGRA days go live by themselves; these were held (a warning, a big jump, the first price) or came from the fallback source. Check each against its official publication. You can correct the numbers.">
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
                        <a href={u.notificationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline">{/ogra\.org\.pk/i.test(u.notificationUrl) ? "OGRA publication (PDF)" : "Notice page"} <ExternalLink size={11} /></a>
                        {u.fileUrl && u.fileUrl !== u.notificationUrl && <a href={u.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline">Release image <ExternalLink size={11} /></a>}
                      </div>
                      {u.extractionDetails?.error && <p className="text-[13px] text-rose-600">{u.extractionDetails.error}</p>}
                      {u.extractionDetails?.held && <p className="flex gap-1.5 text-[13px] text-amber-700"><AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /> Held for review: {u.extractionDetails.held}</p>}
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
                <label className="text-xs text-slate-500">Official notification link<input required type="url" placeholder="https://ogra.org.pk/index.php/download/…" value={manual.sourceUrl} onChange={e => setManual(m => ({ ...m, sourceUrl: e.target.value }))} className={`${field} mt-1`} /></label>
                <label className="text-xs text-slate-500 sm:col-span-2 lg:col-span-3">Note (optional)<input maxLength={300} value={manual.note} onChange={e => setManual(m => ({ ...m, note: e.target.value }))} className={`${field} mt-1`} /></label>
                <div className="flex items-end"><button type="submit" disabled={busy === "manual"} className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{busy === "manual" ? "Saving…" : "Save and publish"}</button></div>
              </form>
            </Panel>
          )}


          {/* History */}
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <Panel title="Pakistan price history" description="The last two months of approved prices, newest first"
              action={canWrite && data.olderHistory.days > 0 && (
                <button type="button" onClick={() => setPruning(true)} className={`${btn.base} ${btn.secondary}`}>
                  <Trash2 size={13} /> Remove older history
                </button>
              )}>
              {data.pkHistory.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">No approved prices yet.</p> : (
                <div className="max-h-[520px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-slate-400"><th className="px-4 py-2 font-medium sm:px-5">Effective</th><th className="px-2 py-2 font-medium">Petrol</th><th className="px-2 py-2 font-medium">Diesel</th>{canWrite && <th className="px-4 py-2 sm:px-5"><span className="sr-only">Actions</span></th>}</tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...data.pkHistory].reverse().map(d => editing?.day === d.date ? (
                      <tr key={d.date}>
                        <td colSpan={4} className="px-4 py-3 sm:px-5">
                          <form onSubmit={async ev => { ev.preventDefault(); if (await call(`edit:${d.date}`, `/api/admin/fuel/day/${d.date}`, "PATCH", editing, "Saved. The public page shows the corrected prices.")) setEditing(null); }}
                            className="grid gap-2 sm:grid-cols-3">
                            <label className="text-xs text-slate-500">Petrol<input required inputMode="decimal" value={editing.petrol} onChange={e => setEditing(x => x && { ...x, petrol: e.target.value })} className={`${field} mt-1`} /></label>
                            <label className="text-xs text-slate-500">Diesel<input required inputMode="decimal" value={editing.diesel} onChange={e => setEditing(x => x && { ...x, diesel: e.target.value })} className={`${field} mt-1`} /></label>
                            <label className="text-xs text-slate-500">Effective from<input required type="date" value={editing.effectiveDate} onChange={e => setEditing(x => x && { ...x, effectiveDate: e.target.value })} className={`${field} mt-1`} /></label>
                            <label className="text-xs text-slate-500 sm:col-span-3">Note (optional)<input maxLength={300} value={editing.note} placeholder="e.g. diesel was typed wrong" onChange={e => setEditing(x => x && { ...x, note: e.target.value })} className={`${field} mt-1`} /></label>
                            <div className="flex gap-2 sm:col-span-3">
                              <button type="submit" disabled={busy === `edit:${d.date}`} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"><Check size={13} /> {busy === `edit:${d.date}` ? "Saving…" : "Save changes"}</button>
                              <button type="button" onClick={() => setEditing(null)} className={`${btn.base} ${btn.secondary}`}>Cancel</button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : (
                      <tr key={d.date}>
                        <td className="px-4 py-2 text-slate-600 sm:px-5">{fuelDate(d.date)}</td><td className="px-2 py-2 tabular-nums">{d.petrol?.toFixed(2) ?? "—"}</td><td className="px-2 py-2 tabular-nums">{d.diesel?.toFixed(2) ?? "—"}</td>
                        {canWrite && (
                          <td className="whitespace-nowrap px-4 py-1.5 text-right sm:px-5">
                            <button type="button" aria-label={`Edit prices of ${fuelDate(d.date)}`} title="Edit" onClick={() => setEditing({ day: d.date, petrol: d.petrol?.toFixed(2) ?? "", diesel: d.diesel?.toFixed(2) ?? "", effectiveDate: d.date, note: "" })}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"><Pencil size={14} /></button>
                            <button type="button" aria-label={`Remove prices of ${fuelDate(d.date)}`} title="Remove" onClick={() => setRemoving({ day: d.date, note: "" })}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </Panel>
            <Panel title="Recently reviewed" description="The audit trail of approvals, rejections and skipped releases"
              action={canWrite && data.reviewed.length > 0 && (
                <button type="button" onClick={() => setClearing(true)} className={`${btn.base} ${btn.secondary}`}>
                  <Trash2 size={13} /> Clear history
                </button>
              )}>
              {data.reviewed.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">Nothing reviewed yet.</p> : (
                <ul className="divide-y divide-slate-100">
                  {data.reviewed.map(u => (
                    <li key={u._id} className="px-4 py-3 text-[13px] sm:px-5">
                      <p className="flex flex-wrap items-center gap-2">
                        <Badge tone={u.status === "APPROVED" ? "green" : u.status === "REJECTED" ? "red" : "neutral"}>{u.status === "SKIPPED" ? "Unchanged" : u.status === "APPROVED" ? (u.method === "MANUAL" ? "Entered" : u.autoPublished ? "Published automatically" : "Approved") : "Rejected"}</Badge>
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
      <ConfirmDialog open={!!removing} onOpenChange={o => !o && setRemoving(null)} tone="danger" icon={Trash2}
        title={removing ? `Remove the prices of ${fuelDate(removing.day)}?` : "Remove prices"}
        description={(
          <>
            They leave the public page and the charts straight away. The earlier day&apos;s prices show again if this was the latest.
            <label className="mt-3 block text-xs text-slate-500">Why (kept in Activity)
              <input autoFocus maxLength={300} value={removing?.note ?? ""} onChange={e => setRemoving(x => x && { ...x, note: e.target.value })} placeholder="e.g. entered under the wrong date" className={`${field} mt-1`} />
            </label>
          </>
        )}
        confirmLabel="Remove prices" loadingLabel="Removing…" loading={!!removing && busy === `remove:${removing.day}`}
        onConfirm={async () => { if (removing && await call(`remove:${removing.day}`, `/api/admin/fuel/day/${removing.day}`, "DELETE", { note: removing.note }, "Removed from the public page.")) setRemoving(null); }} />
      <ConfirmDialog open={pruning} onOpenChange={setPruning} tone="danger" icon={Trash2}
        title="Remove the older price history?"
        description={`${data?.olderHistory.days ?? 0} published day${data?.olderHistory.days === 1 ? "" : "s"} older than ${data?.olderHistory.keepDays ?? 60} days will be deleted for good. The last two months, and today's prices, stay on the public page. The removal is kept in Activity.`}
        confirmLabel="Remove older history" loadingLabel="Removing…" loading={busy === "prune"}
        onConfirm={async () => { if (await call("prune", "/api/admin/fuel/history", "DELETE", undefined, "Older price history removed.")) setPruning(false); }} />
      <ConfirmDialog open={clearing} onOpenChange={setClearing} tone="danger" icon={Trash2}
        title="Clear the review history?"
        description="The approved, rejected and unchanged entries leave this list. Published prices, the price history and the public page don't change, waiting releases stay, and every approval is still in Activity."
        confirmLabel="Clear history" loadingLabel="Clearing…" loading={busy === "clearHistory"}
        onConfirm={async () => { if (await call("clearHistory", "/api/admin/fuel", "DELETE", undefined, "Review history cleared.")) setClearing(false); }} />
      <p className="mt-6 flex items-center gap-1.5 text-xs text-slate-400"><Fuel size={13} /> The public page is /fuel-prices. Pakistani prices come from OGRA&apos;s price publications (petroleum.gov.pk as a fallback).</p>
    </div>
  );
}
