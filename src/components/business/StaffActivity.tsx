"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { BadgeDollarSign, Briefcase, CalendarCheck, Car, History, Star, Tag, Trash2, User, Users, Wallet, X, type LucideIcon } from "lucide-react";
import Select from "@/components/ui/Select";
import { BUSINESS_ACTION_LABEL } from "@/lib/businessActions";

type Entry = { _id: string; userId: string; userName: string; action: string; targetType: string; targetLabel?: string; details?: string; amount?: number; createdAt: string };

const ICON: Record<string, LucideIcon> = { BOOKING: CalendarCheck, SALE: BadgeDollarSign, CUSTOMER: Users, DEAL: Tag, LISTING: Car, STAFF: User, MONEY: Wallet, BUSINESS: Briefcase, REVIEW: Star };
const TYPES = [["", "Everything"], ["BOOKING", "Bookings"], ["SALE", "Sales"], ["CUSTOMER", "Customers"], ["MONEY", "Money"], ["LISTING", "Listings"], ["DEAL", "Deals"], ["STAFF", "Team"], ["BUSINESS", "Settings"], ["REVIEW", "Reviews"]] as const;

const when = (d: string) => {
  const date = new Date(d);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? `Today ${date.toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" })}`
    : date.toLocaleString("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
};

const CLEAR_CHOICES = [
  { id: "30", label: "Older than 30 days", hint: "Keeps the last month" },
  { id: "90", label: "Older than 90 days", hint: "Keeps the last three months" },
  { id: "all", label: "Everything", hint: "Deletes the whole history" },
] as const;

/** Owner deletes old activity: older than 30 or 90 days, or everything. */
function ClearHistoryDialog({ open, onOpenChange, onCleared }: { open: boolean; onOpenChange: (o: boolean) => void; onCleared: (n: number) => void }) {
  const [choice, setChoice] = useState<(typeof CLEAR_CHOICES)[number]["id"]>("30");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function clear() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/business/activity${choice === "all" ? "" : `?olderThan=${choice}`}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(d.error || "Couldn't delete the history"); return; }
    onCleared(d.deleted ?? 0);
  }

  return (
    <Dialog.Root open={open} onOpenChange={o => { if (!busy) { onOpenChange(o); setError(""); } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-slate-950/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--gh-fff0f0)] text-[var(--gh-cf222e)]"><Trash2 size={18} /></span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-base font-semibold text-[var(--gh-0d1117)]">Delete activity history</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[var(--gh-57606a)]">Deleted entries can&apos;t be brought back.</Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="rounded-full p-1 text-[var(--gh-8c959f)] hover:bg-[var(--gh-f6f8fa)]"><X size={18} /></Dialog.Close>
          </div>
          <div role="radiogroup" aria-label="What to delete" className="mt-5 space-y-1.5">
            {CLEAR_CHOICES.map(c => (
              <button key={c.id} type="button" role="radio" aria-checked={choice === c.id} onClick={() => setChoice(c.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${choice === c.id ? "border-[var(--gh-0d1117)] ring-2 ring-[var(--gh-0d1117)]/10" : "border-[var(--gh-e1e4e8)]"}`}>
                <span className={`h-4 w-4 flex-shrink-0 rounded-full border-2 ${choice === c.id ? "border-[5px] border-[var(--gh-0d1117)]" : "border-[var(--gh-d0d7de)]"}`} />
                <span>
                  <span className="block text-sm font-semibold text-[var(--gh-0d1117)]">{c.label}</span>
                  <span className="block text-xs text-[var(--gh-57606a)]">{c.hint}</span>
                </span>
              </button>
            ))}
          </div>
          {choice !== "90" && (
            <p className="mt-3 rounded-lg bg-[var(--gh-fff8c5)] px-3 py-2 text-[11px] text-[var(--gh-7d4e00)]">
              The Performance tab counts from this history, so deleting {choice === "all" ? "it" : "last month's entries"} also clears {choice === "all" ? "those numbers" : "last month's numbers"}.
            </p>
          )}
          {error && <p role="alert" className="mt-3 rounded-lg bg-[var(--gh-fff0f0)] px-3 py-2 text-xs text-[var(--gh-cf222e)]">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild><button type="button" disabled={busy} className="rounded-lg px-4 py-2.5 text-[13px] font-semibold text-[var(--gh-0d1117)] ring-1 ring-inset ring-[var(--gh-e1e4e8)]">Cancel</button></Dialog.Close>
            <button type="button" onClick={clear} disabled={busy} className="rounded-lg bg-[var(--gh-cf222e)] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50">{busy ? "Deleting…" : "Delete history"}</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Staff → Activity (owner only): who did what in the console, newest first. */
export default function StaffActivity({ members }: { members: { userId: string; name: string }[] }) {
  const [member, setMember] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ entries: Entry[]; pages: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [clearOpen, setClearOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const p = new URLSearchParams({ page: String(page) });
    if (member) p.set("member", member);
    if (type) p.set("type", type);
    fetch(`/api/business/activity?${p}`)
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message || "Couldn't load activity"));
  }, [member, type, page, reload]);

  return (
    <div>
      <ClearHistoryDialog open={clearOpen} onOpenChange={setClearOpen}
        onCleared={n => { setClearOpen(false); setNotice(n ? `Deleted ${n} entr${n === 1 ? "y" : "ies"}.` : "Nothing to delete for that choice."); setPage(1); setData(null); setReload(x => x + 1); }} />
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Select value={member} onChange={v => { setPage(1); setData(null); setMember(v); }} ariaLabel="Team member" size="md"
          options={[{ value: "", label: "Everyone" }, ...members.map(m => ({ value: m.userId, label: m.name }))]} />
        <Select value={type} onChange={v => { setPage(1); setData(null); setType(v); }} ariaLabel="Type" size="md"
          options={TYPES.map(([value, label]) => ({ value, label }))} />
        <button type="button" onClick={() => { setNotice(""); setClearOpen(true); }}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[var(--gh-ffcdd2)] bg-white px-3.5 text-[13px] font-semibold text-[var(--gh-cf222e)] transition hover:bg-[var(--gh-fff0f0)]">
          <Trash2 size={14} /> Delete history
        </button>
      </div>
      {notice && <p role="status" className="mb-3 rounded-lg bg-[var(--gh-dafbe1)] px-3 py-2 text-xs font-semibold text-[var(--gh-1a7f37)]">{notice}</p>}

      {error ? (
        <p className="rounded-xl bg-[var(--gh-fff0f0)] p-4 text-sm text-[var(--gh-cf222e)]">{error}</p>
      ) : data === null ? (
        <div className="h-40 animate-pulse rounded-xl bg-white" />
      ) : data.entries.length === 0 ? (
        <div className="rounded-xl border border-[var(--gh-e1e4e8)] bg-white px-6 py-12 text-center">
          <History size={26} strokeWidth={1.5} className="mx-auto mb-2 text-[var(--gh-8c959f)]" />
          <p className="text-sm font-semibold text-[var(--gh-0d1117)]">Nothing recorded yet</p>
          <p className="mt-1 text-[13px] text-[var(--gh-57606a)]">Bookings, sales, payments and changes your team makes will appear here.</p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--gh-f6f8fa)] overflow-hidden rounded-xl border border-[var(--gh-e1e4e8)] bg-white">
          {data.entries.map(e => {
            const Icon = ICON[e.targetType] ?? History;
            return (
              <li key={e._id} className="flex gap-3 px-4 py-3">
                <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--gh-f6f8fa)] text-[var(--gh-57606a)]"><Icon size={15} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-[var(--gh-0d1117)]">
                    <span className="font-semibold">{e.userName}</span>{" "}
                    <span className="text-[var(--gh-57606a)]">{(BUSINESS_ACTION_LABEL[e.action] ?? e.action).replace(/^./, c => c.toLowerCase())}</span>
                    {e.targetLabel && <span className="font-medium"> · {e.targetLabel}</span>}
                  </p>
                  {e.details && <p className="mt-0.5 truncate text-xs text-[var(--gh-8c959f)]">{e.details}</p>}
                </div>
                <span className="flex-shrink-0 text-right text-[11px] text-[var(--gh-8c959f)]">{when(e.createdAt)}</span>
              </li>
            );
          })}
        </ul>
      )}

      {data && data.pages > 1 && (
        <div className="mt-3 flex items-center justify-between text-xs text-[var(--gh-57606a)]">
          <span>{data.total} actions</span>
          <span className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-3 py-1.5 font-semibold disabled:opacity-40">Newer</button>
            {page} / {data.pages}
            <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-3 py-1.5 font-semibold disabled:opacity-40">Older</button>
          </span>
        </div>
      )}
    </div>
  );
}
