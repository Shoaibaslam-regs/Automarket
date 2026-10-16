"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowDownLeft, ArrowUpRight, Car, ChevronLeft, ChevronRight, Lock, Plus, Trash2, Wallet, X } from "lucide-react";
import Select from "@/components/ui/Select";
import ConfirmDialog from "@/components/business/ConfirmDialog";
import { MANUAL_IN, MANUAL_OUT, MONEY_LABEL, MONEY_OUT, pkDay } from "@/lib/money";
import { formatLakh } from "@/lib/format";

type Entry = {
  _id: string; type: "IN" | "OUT"; category: string; amount: number; date: string; note?: string;
  listingId?: string; vehicleTitle?: string; vehicleLabel?: string; source: "MANUAL" | "AUTO"; createdByName?: string;
};
type Vehicle = { id: string; title: string; status: string };
type Totals = { in: number; out: number; opening: number; closing: number };
type ProfitRow = { id: string; title: string; status: string; image?: string; purchase: number; otherCosts: number; costs: number; sale: number; rent: number; rentals: number; income: number; profit: number };

const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString()}`;
const shiftDay = (day: string, by: number) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + by); return d.toISOString().slice(0, 10); };
const shiftMonth = (month: string, by: number) => { const [y, m] = month.split("-").map(Number); const d = new Date(Date.UTC(y, m - 1 + by, 1)); return d.toISOString().slice(0, 7); };
const monthEnd = (month: string) => { const [y, m] = month.split("-").map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); };
const dayLabel = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const monthLabel = (month: string) => new Date(`${month}-15T12:00:00Z`).toLocaleDateString("en-PK", { month: "long", year: "numeric" });
const VEHICLE_CATS = new Set(MONEY_OUT.filter(c => c.vehicle).map(c => c.id as string));

/** Adds money in or out by hand. Expenses can be linked to a vehicle for profit per vehicle. */
function AddEntryDialog({ open, type, vehicles, onClose, onSaved }: { open: boolean; type: "IN" | "OUT"; vehicles: Vehicle[]; onClose: () => void; onSaved: () => void }) {
  const today = pkDay();
  const [f, setF] = useState({ category: "", amount: "", date: today, vehicle: "", vehicleLabel: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const key = open ? type : null;
  if (key !== openedFor) {
    setOpenedFor(key);
    setF({ category: "", amount: "", date: today, vehicle: "", vehicleLabel: "", note: "" });
    setError("");
  }
  const cats = type === "OUT" ? MANUAL_OUT : MANUAL_IN;
  const showVehicle = type === "OUT" && VEHICLE_CATS.has(f.category);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/business/money/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type, category: f.category, amount: f.amount, date: f.date, note: f.note,
        listingId: showVehicle && f.vehicle && f.vehicle !== "other" ? f.vehicle : undefined,
        vehicleLabel: showVehicle && f.vehicle === "other" ? f.vehicleLabel : undefined,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(d.error || "Couldn't save"); return; }
    onSaved();
  }

  const field = "h-10 w-full rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-3 text-[13px] text-[var(--gh-0d1117)] outline-none focus:border-[var(--gh-0d1117)]";
  return (
    <Dialog.Root open={open} onOpenChange={o => !busy && !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-slate-950/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] max-h-[calc(100vh-32px)] w-[calc(100%-32px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start gap-3">
            <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${type === "OUT" ? "bg-[var(--gh-fff0f0)] text-[var(--gh-cf222e)]" : "bg-[var(--gh-dafbe1)] text-[var(--gh-1a7f37)]"}`}>
              {type === "OUT" ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-base font-semibold text-[var(--gh-0d1117)]">{type === "OUT" ? "Add expense / money out" : "Add money in"}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[var(--gh-57606a)]">
                {type === "OUT" ? "Link it to a vehicle to see that vehicle's real profit." : "Booking and sale payments are added automatically; use this for anything else."}
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="rounded-full p-1 text-[var(--gh-8c959f)] hover:bg-[var(--gh-f6f8fa)]"><X size={18} /></Dialog.Close>
          </div>
          <form onSubmit={save} className="mt-5 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--gh-0d1117)]">Category</label>
              <Select value={f.category} onChange={v => setF(p => ({ ...p, category: v }))} placeholder="Choose…" ariaLabel="Category" size="md"
                options={cats.map(c => ({ value: c.id, label: c.label }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="me-amount" className="mb-1 block text-xs font-semibold text-[var(--gh-0d1117)]">Amount (PKR)</label>
                <input id="me-amount" type="number" min={1} inputMode="numeric" value={f.amount} onChange={e => setF(p => ({ ...p, amount: e.target.value }))} className={field} />
              </div>
              <div>
                <label htmlFor="me-date" className="mb-1 block text-xs font-semibold text-[var(--gh-0d1117)]">Date</label>
                <input id="me-date" type="date" max={today} value={f.date} onChange={e => setF(p => ({ ...p, date: e.target.value }))} className={field} />
              </div>
            </div>
            {showVehicle && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--gh-0d1117)]">Vehicle (optional)</label>
                <Select value={f.vehicle} onChange={v => setF(p => ({ ...p, vehicle: v }))} placeholder="Not for one vehicle" ariaLabel="Vehicle" size="md"
                  options={[{ value: "", label: "Not for one vehicle" }, ...vehicles.map(v => ({ value: v.id, label: v.title })), { value: "other", label: "Other vehicle (not listed)" }]} />
                {f.vehicle === "other" && (
                  <input value={f.vehicleLabel} onChange={e => setF(p => ({ ...p, vehicleLabel: e.target.value }))} placeholder="e.g. Honda City 2019 white" className={`${field} mt-2`} aria-label="Vehicle name" />
                )}
              </div>
            )}
            <input value={f.note} onChange={e => setF(p => ({ ...p, note: e.target.value }))} maxLength={300} placeholder="Note (optional), e.g. new tyres" className={field} aria-label="Note" />
            {error && <p role="alert" className="rounded-lg bg-[var(--gh-fff0f0)] px-3 py-2 text-xs text-[var(--gh-cf222e)]">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Dialog.Close asChild><button type="button" disabled={busy} className="rounded-lg px-4 py-2.5 text-[13px] font-semibold text-[var(--gh-0d1117)] ring-1 ring-inset ring-[var(--gh-e1e4e8)]">Cancel</button></Dialog.Close>
              <button type="submit" disabled={busy || !f.category || !f.amount} className="rounded-lg bg-[var(--gh-0d1117)] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function EntryRow({ e, onDelete }: { e: Entry; onDelete?: (e: Entry) => void }) {
  const out = e.type === "OUT";
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${out ? "bg-[var(--gh-fff0f0)] text-[var(--gh-cf222e)]" : "bg-[var(--gh-dafbe1)] text-[var(--gh-1a7f37)]"}`}>
        {out ? <ArrowUpRight size={15} /> : <ArrowDownLeft size={15} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-[var(--gh-0d1117)]">
          {MONEY_LABEL[e.category] ?? e.category}
          {(e.vehicleTitle || e.vehicleLabel) && <span className="font-normal text-[var(--gh-57606a)]"> · {e.vehicleTitle || e.vehicleLabel}</span>}
        </p>
        <p className="truncate text-[11px] text-[var(--gh-8c959f)]">
          {e.note && <>{e.note} · </>}
          {new Date(e.date).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
          {e.createdByName && <> · {e.createdByName}</>}
          {e.source === "AUTO" && <> · automatic</>}
        </p>
      </div>
      <span className={`flex-shrink-0 text-[13px] font-bold tabular-nums ${out ? "text-[var(--gh-cf222e)]" : "text-[var(--gh-1a7f37)]"}`}>{out ? "−" : "+"}{pkr(e.amount)}</span>
      {onDelete && e.source === "MANUAL" && (
        <button onClick={() => onDelete(e)} aria-label="Delete entry" className="flex-shrink-0 rounded-md p-1 text-[var(--gh-8c959f)] hover:bg-[var(--gh-fff0f0)] hover:text-[var(--gh-cf222e)]"><Trash2 size={14} /></button>
      )}
    </li>
  );
}

/** Business console: cash book, expenses and profit per vehicle (owner and managers). */
export default function MoneyPage() {
  const [tab, setTab] = useState<"cash" | "expenses" | "profit">("cash");
  const [day, setDay] = useState(pkDay());
  const [month, setMonth] = useState(pkDay().slice(0, 7));
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [data, setData] = useState<{ entries: Entry[]; totals: Totals; vehicles: Vehicle[] } | null>(null);
  const [profit, setProfit] = useState<{ vehicles: ProfitRow[]; totals: { costs: number; income: number; profit: number } } | null>(null);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [adding, setAdding] = useState<"IN" | "OUT" | null>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (tab === "profit") {
      fetch("/api/business/money/profit")
        .then(async r => { const d = await r.json(); if (r.status === 403) setForbidden(true); if (!r.ok) throw new Error(d.error); setProfit(d); })
        .catch(e => setError(e.message || "Couldn't load"));
      return;
    }
    const p = tab === "cash"
      ? new URLSearchParams({ from: day, to: day })
      : new URLSearchParams({ from: `${month}-01`, to: monthEnd(month), kind: "expenses", ...(vehicleFilter ? { listing: vehicleFilter } : {}) });
    fetch(`/api/business/money/entries?${p}`)
      .then(async r => { const d = await r.json(); if (r.status === 403) setForbidden(true); if (!r.ok) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message || "Couldn't load"));
  }, [tab, day, month, vehicleFilter, reload]);

  async function remove() {
    if (!deleting) return;
    setDelBusy(true);
    const res = await fetch(`/api/business/money/entries/${deleting._id}`, { method: "DELETE" });
    setDelBusy(false);
    if (res.ok) { setDeleting(null); setReload(n => n + 1); }
  }

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    data?.entries.forEach(e => m.set(e.category, (m.get(e.category) ?? 0) + e.amount));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  const today = pkDay();
  const navBtn = "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--gh-e1e4e8)] bg-white text-[var(--gh-0d1117)] disabled:opacity-40";

  if (forbidden) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-sm rounded-2xl border border-[var(--gh-e1e4e8)] bg-white p-8 text-center">
          <Lock size={26} className="mx-auto mb-3 text-[var(--gh-8c959f)]" />
          <p className="text-sm font-semibold text-[var(--gh-0d1117)]">Money is for the owner and managers</p>
          <p className="mt-1 text-[13px] text-[var(--gh-57606a)]">Ask your business owner if you need to see expenses or the cash book.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gh-f6f8fa)]">
      <AddEntryDialog open={adding !== null} type={adding ?? "OUT"} vehicles={data?.vehicles ?? []} onClose={() => setAdding(null)} onSaved={() => { setAdding(null); setReload(n => n + 1); }} />
      <ConfirmDialog open={deleting !== null} onOpenChange={o => !o && setDeleting(null)} title="Delete this entry?"
        description={deleting ? <>{MONEY_LABEL[deleting.category]} · {pkr(deleting.amount)} will be removed from your records.</> : null}
        confirmLabel="Delete entry" loading={delBusy} onConfirm={remove} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--gh-e1e4e8)] bg-white px-4 py-5 sm:px-6">
        <div>
          <Link href="/business/dashboard" className="text-xs text-[var(--gh-57606a)] hover:text-[var(--gh-0d1117)]">← Dashboard</Link>
          <h1 className="mt-1 text-lg font-bold text-[var(--gh-0d1117)]">Money</h1>
          <p className="mt-0.5 text-xs text-[var(--gh-57606a)]">Daily cash book, expenses, and the real profit on each vehicle</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAdding("IN")} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-3.5 py-2.5 text-[13px] font-semibold text-[var(--gh-1a7f37)]"><Plus size={14} /> Money in</button>
          <button onClick={() => setAdding("OUT")} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--gh-0d1117)] px-3.5 py-2.5 text-[13px] font-semibold text-white"><Plus size={14} /> Expense</button>
        </div>
      </div>
      <div className="flex gap-1 border-b border-[var(--gh-e1e4e8)] bg-white px-4 sm:px-6">
        {([["cash", "Cash book"], ["expenses", "Expenses"], ["profit", "Profit per vehicle"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => { setError(""); setTab(id); }} aria-current={tab === id ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2.5 text-[13px] font-semibold ${tab === id ? "border-[var(--gh-0d1117)] text-[var(--gh-0d1117)]" : "border-transparent text-[var(--gh-57606a)]"}`}>{label}</button>
        ))}
      </div>

      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
        {error && <p role="alert" className="mb-4 rounded-xl bg-[var(--gh-fff0f0)] p-3 text-sm text-[var(--gh-cf222e)]">{error}</p>}

        {tab === "cash" && (
          <>
            <div className="mb-4 flex items-center justify-between gap-2">
              <button onClick={() => { setData(null); setDay(d => shiftDay(d, -1)); }} aria-label="Previous day" className={navBtn}><ChevronLeft size={16} /></button>
              <div className="text-center">
                <p className="text-sm font-bold text-[var(--gh-0d1117)]">{day === today ? "Today" : dayLabel(day)}</p>
                {day !== today && <button onClick={() => { setData(null); setDay(today); }} className="text-[11px] font-semibold text-[var(--gh-0550ae)]">Back to today</button>}
              </div>
              <button onClick={() => { setData(null); setDay(d => shiftDay(d, 1)); }} disabled={day >= today} aria-label="Next day" className={navBtn}><ChevronRight size={16} /></button>
            </div>
            {data && (
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: "Opening balance", v: data.totals.opening, c: "var(--gh-0d1117)" },
                  { label: "Money in", v: data.totals.in, c: "var(--gh-1a7f37)" },
                  { label: "Money out", v: data.totals.out, c: "var(--gh-cf222e)" },
                  { label: "Closing balance", v: data.totals.closing, c: data.totals.closing < 0 ? "var(--gh-cf222e)" : "var(--gh-0d1117)" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl border border-[var(--gh-e1e4e8)] bg-white p-3">
                    <p className="text-[11px] text-[var(--gh-8c959f)]">{s.label}</p>
                    <p className="mt-1 text-[15px] font-extrabold tabular-nums" style={{ color: s.c }}>{pkr(s.v)}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "expenses" && (
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => { setData(null); setMonth(m => shiftMonth(m, -1)); }} aria-label="Previous month" className={navBtn}><ChevronLeft size={16} /></button>
              <p className="min-w-[130px] text-center text-sm font-bold text-[var(--gh-0d1117)]">{monthLabel(month)}</p>
              <button onClick={() => { setData(null); setMonth(m => shiftMonth(m, 1)); }} disabled={month >= today.slice(0, 7)} aria-label="Next month" className={navBtn}><ChevronRight size={16} /></button>
            </div>
            <div className="sm:w-64">
              <Select value={vehicleFilter} onChange={v => { setData(null); setVehicleFilter(v); }} ariaLabel="Vehicle" size="md"
                options={[{ value: "", label: "All vehicles" }, ...(data?.vehicles ?? []).map(v => ({ value: v.id, label: v.title }))]} />
            </div>
          </div>
        )}

        {tab !== "profit" && (
          data === null ? <div className="h-40 animate-pulse rounded-xl bg-white" /> : (
            <>
              {tab === "expenses" && data.entries.length > 0 && (
                <div className="mb-3 rounded-xl border border-[var(--gh-e1e4e8)] bg-white p-3">
                  <p className="text-[11px] text-[var(--gh-8c959f)]">Spent in {monthLabel(month)}</p>
                  <p className="text-lg font-extrabold tabular-nums text-[var(--gh-cf222e)]">{pkr(data.totals.out)}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {byCategory.map(([c, v]) => (
                      <span key={c} className="rounded-full bg-[var(--gh-f6f8fa)] px-2 py-0.5 text-[11px] text-[var(--gh-57606a)]">{MONEY_LABEL[c] ?? c} · <strong className="text-[var(--gh-0d1117)]">PKR {formatLakh(v)}</strong></span>
                    ))}
                  </div>
                </div>
              )}
              {data.entries.length === 0 ? (
                <div className="rounded-xl border border-[var(--gh-e1e4e8)] bg-white px-6 py-12 text-center">
                  <Wallet size={26} strokeWidth={1.5} className="mx-auto mb-2 text-[var(--gh-8c959f)]" />
                  <p className="text-sm font-semibold text-[var(--gh-0d1117)]">{tab === "cash" ? "Nothing on this day" : "No expenses this month"}</p>
                  <p className="mt-1 text-[13px] text-[var(--gh-57606a)]">{tab === "cash" ? "Payments you record on bookings and sales appear here by themselves." : "Add repairs, fuel, token tax and other costs with Expense."}</p>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--gh-f6f8fa)] overflow-hidden rounded-xl border border-[var(--gh-e1e4e8)] bg-white">
                  {data.entries.map(e => <EntryRow key={e._id} e={e} onDelete={setDeleting} />)}
                </ul>
              )}
            </>
          )
        )}

        {tab === "profit" && (
          profit === null ? <div className="h-40 animate-pulse rounded-xl bg-white" /> : profit.vehicles.length === 0 ? (
            <div className="rounded-xl border border-[var(--gh-e1e4e8)] bg-white px-6 py-12 text-center">
              <Car size={26} strokeWidth={1.5} className="mx-auto mb-2 text-[var(--gh-8c959f)]" />
              <p className="text-sm font-semibold text-[var(--gh-0d1117)]">No profit to show yet</p>
              <p className="mt-1 text-[13px] text-[var(--gh-57606a)]">Add expenses linked to a vehicle (start with &ldquo;Vehicle purchase&rdquo;). Sales and completed rentals count as income.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-3 gap-2">
                {[["Earned", profit.totals.income, "var(--gh-1a7f37)"], ["Spent", profit.totals.costs, "var(--gh-cf222e)"], ["Profit", profit.totals.profit, profit.totals.profit < 0 ? "var(--gh-cf222e)" : "var(--gh-0d1117)"]].map(([l, v, c]) => (
                  <div key={l as string} className="rounded-xl border border-[var(--gh-e1e4e8)] bg-white p-3">
                    <p className="text-[11px] text-[var(--gh-8c959f)]">{l}</p>
                    <p className="mt-1 text-[15px] font-extrabold tabular-nums" style={{ color: c as string }}>{(v as number) < 0 ? "−" : ""}PKR {formatLakh(Math.abs(v as number))}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-2">
                {profit.vehicles.map(v => (
                  <div key={v.id} className="flex gap-3 rounded-xl border border-[var(--gh-e1e4e8)] bg-white p-3">
                    <div className="relative h-14 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--gh-f6f8fa)]">
                      {v.image ? <Image src={v.image} alt="" fill sizes="64px" className="object-cover" /> : <Car size={18} className="m-auto mt-4 text-[var(--gh-8c959f)]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-[13px] font-bold text-[var(--gh-0d1117)]">{v.title}</p>
                        <p className={`flex-shrink-0 text-[14px] font-extrabold tabular-nums ${v.profit < 0 ? "text-[var(--gh-cf222e)]" : "text-[var(--gh-1a7f37)]"}`}>{v.profit < 0 ? "−" : "+"}PKR {formatLakh(Math.abs(v.profit))}</p>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-[var(--gh-57606a)]">
                        {v.purchase > 0 && <>Bought {pkr(v.purchase)} · </>}
                        {v.otherCosts > 0 && <>Costs {pkr(v.otherCosts)} · </>}
                        {v.sale > 0 && <>Sold {pkr(v.sale)} · </>}
                        {v.rent > 0 && <>Rent {pkr(v.rent)} ({v.rentals} booking{v.rentals !== 1 ? "s" : ""}) · </>}
                        <span className="font-semibold">{v.status === "SOLD" ? "Sold" : v.status === "RENTED" ? "Out on rent" : "In stock"}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-[var(--gh-8c959f)]">Profit = sale price + completed rental income − expenses linked to the vehicle. A vehicle still in stock shows a loss until it earns.</p>
            </>
          )
        )}
      </div>
    </div>
  );
}
