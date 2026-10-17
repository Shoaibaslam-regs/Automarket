"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { BellRing, Check, MessageCircle, Phone, X } from "lucide-react";
import Tip from "@/components/ui/Tip";

export type FollowUpItem = {
  _id: string; customerId: string; customerName: string; customerPhone?: string; dueAt: string; note: string; doneAt?: string;
  createdBy?: { name?: string } | null;
};

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
const pkDay = (d: Date | string) => new Date(new Date(d).getTime() + PKT_OFFSET_MS).toISOString().slice(0, 10);

/** "overdue", "today" or "later", by Pakistan calendar day. */
export function followUpWhen(f: { dueAt: string }, now = new Date()): "overdue" | "today" | "later" {
  const d = pkDay(f.dueAt), t = pkDay(now);
  return d < t ? "overdue" : d === t ? "today" : "later";
}

const when = (d: string) => {
  const day = new Date(d);
  const diff = Math.round((new Date(`${pkDay(day)}T00:00:00Z`).getTime() - new Date(`${pkDay(new Date())}T00:00:00Z`).getTime()) / 86400000);
  const time = day.toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" });
  if (diff === 0) return `Today, ${time}`;
  if (diff === 1) return `Tomorrow, ${time}`;
  if (diff === -1) return `Yesterday`;
  if (diff < 0) return `${-diff} days ago`;
  return day.toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short" });
};

/** A local datetime-input value `days` from now at `hour`:00. */
function at(days: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

const QUICK = [
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "Next week", days: 7 },
  { label: "In 2 weeks", days: 14 },
];

/** Adds a follow-up reminder for one customer. */
export function FollowUpDialog({ customer, onClose, onSaved }: {
  customer: { _id: string; name: string } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [due, setDue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const key = customer?._id ?? null;
  if (key !== openedFor) {
    setOpenedFor(key);
    setDue(at(1, 11));
    setNote("");
    setError("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!customer) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/business/followups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: customer._id, dueAt: new Date(due).toISOString(), note }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(d.error || "Couldn't save"); return; }
    onSaved();
  }

  const field = "h-10 w-full rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-3 text-[13px] text-[var(--gh-0d1117)] outline-none focus:border-[var(--gh-0d1117)]";
  return (
    <Dialog.Root open={customer !== null} onOpenChange={o => !busy && !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-slate-950/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] max-h-[calc(100vh-32px)] w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--gh-0d1117)] text-white"><BellRing size={18} /></span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-base font-semibold text-[var(--gh-0d1117)]">Follow up with {customer?.name}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[var(--gh-57606a)]">It shows on Customers and the dashboard on the day.</Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="rounded-full p-1 text-[var(--gh-8c959f)] hover:bg-[var(--gh-f6f8fa)]"><X size={18} /></Dialog.Close>
          </div>
          <form onSubmit={save} className="mt-5 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {QUICK.map(q => {
                const v = at(q.days, 11);
                return (
                  <button key={q.label} type="button" onClick={() => setDue(v)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${due === v ? "bg-[var(--gh-0d1117)] text-white" : "bg-white text-[var(--gh-57606a)] ring-1 ring-inset ring-[var(--gh-e1e4e8)]"}`}>{q.label}</button>
                );
              })}
            </div>
            <input type="datetime-local" value={due} onChange={e => setDue(e.target.value)} aria-label="When" className={field} />
            <input value={note} onChange={e => setNote(e.target.value)} maxLength={300} autoFocus aria-label="About"
              placeholder="About what? e.g. Call about the Civic test drive" className={field} />
            {error && <p role="alert" className="rounded-lg bg-[var(--gh-fff0f0)] px-3 py-2 text-xs text-[var(--gh-cf222e)]">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Dialog.Close asChild><button type="button" disabled={busy} className="rounded-lg px-4 py-2.5 text-[13px] font-semibold text-[var(--gh-0d1117)] ring-1 ring-inset ring-[var(--gh-e1e4e8)]">Cancel</button></Dialog.Close>
              <button type="submit" disabled={busy || !due || !note.trim()} className="rounded-lg bg-[var(--gh-0d1117)] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Add follow-up"}</button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Open follow-ups, overdue first, with call/WhatsApp and a Done tick. `limit` shows only the first few
 * (the dashboard), with a link to Customers for the rest.
 */
export function FollowUpList({ items, canEdit, onDone, limit, compact }: {
  items: FollowUpItem[];
  canEdit: boolean;
  onDone: (f: FollowUpItem) => void;
  limit?: number;
  compact?: boolean;
}) {
  const now = new Date();
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <ul className="divide-y divide-[var(--gh-f6f8fa)]">
      {shown.map(f => {
        const w = followUpWhen(f, now);
        const phone = f.customerPhone?.replace(/\D/g, "");
        return (
          <li key={f._id} className="flex items-center gap-3 px-4 py-2.5">
            {canEdit ? (
              <button type="button" onClick={() => onDone(f)} aria-label={`Mark done: ${f.note}`} title="Done"
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-[var(--gh-d0d7de)] text-transparent transition hover:border-[var(--gh-1a7f37)] hover:text-[var(--gh-1a7f37)]">
                <Check size={12} strokeWidth={3} />
              </button>
            ) : <BellRing size={14} className="flex-shrink-0 text-[var(--gh-8c959f)]" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-[var(--gh-0d1117)]"><strong>{f.customerName}</strong> · {f.note}</p>
              <p className={`text-[11px] ${w === "overdue" ? "font-semibold text-[var(--gh-cf222e)]" : w === "today" ? "font-semibold text-[var(--gh-9a6700)]" : "text-[var(--gh-8c959f)]"}`}>
                {w === "overdue" ? "Overdue · " : ""}{when(f.dueAt)}{!compact && f.createdBy?.name ? ` · by ${f.createdBy.name}` : ""}
              </p>
            </div>
            {phone && (
              <>
                <a href={`tel:${f.customerPhone}`} aria-label={`Call ${f.customerName}`} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[var(--gh-0d1117)] hover:bg-[var(--gh-f6f8fa)]"><Phone size={14} /></a>
                <a href={`https://wa.me/${phone}?text=${encodeURIComponent(`Hi ${f.customerName}, `)}`} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${f.customerName}`}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[var(--gh-1a7f37)] hover:bg-[var(--gh-f6f8fa)]"><MessageCircle size={14} /></a>
              </>
            )}
          </li>
        );
      })}
      {limit && items.length > limit && (
        <li className="px-4 py-2.5 text-center">
          <Link href="/business/customers" className="text-xs font-semibold text-[var(--gh-0550ae)]">See all {items.length} follow-ups</Link>
        </li>
      )}
    </ul>
  );
}

/** Dashboard card: follow-ups due today or overdue. Hidden when nothing is due. */
export function DueFollowUpsCard() {
  const [items, setItems] = useState<FollowUpItem[] | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  useEffect(() => {
    fetch("/api/business/followups")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) { setItems((d.followUps as FollowUpItem[]).filter(f => followUpWhen(f) !== "later")); setCanEdit(!!d.canEdit); } })
      .catch(() => {});
  }, []);
  if (!items?.length) return null;
  async function done(f: FollowUpItem) {
    setItems(prev => prev?.filter(x => x._id !== f._id) ?? null);
    await fetch(`/api/business/followups/${f._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done: true }) }).catch(() => {});
  }
  const overdue = items.filter(f => followUpWhen(f) === "overdue").length;
  return (
    <div className="mb-5 overflow-hidden rounded-xl border border-[var(--gh-e1e4e8)] bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--gh-f6f8fa)] px-4 py-3">
        <p className="flex items-center gap-1.5 text-[13px] font-bold text-[var(--gh-0d1117)]"><BellRing size={14} /> Follow-ups due <Tip id="followUp" /></p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${overdue ? "bg-[var(--gh-fff0f0)] text-[var(--gh-cf222e)]" : "bg-[var(--gh-fff8c5)] text-[var(--gh-7d4e00)]"}`}>
          {overdue ? `${overdue} overdue` : `${items.length} today`}
        </span>
      </div>
      <FollowUpList items={items} canEdit={canEdit} onDone={done} limit={5} compact />
    </div>
  );
}
