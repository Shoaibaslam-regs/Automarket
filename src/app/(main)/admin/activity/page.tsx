"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { History, Trash2, X } from "lucide-react";
import { Badge, PageHeader, Panel, SearchField, Segmented, btn, type Tone } from "@/components/admin/ui";
import { ADMIN_ACTION_LABEL } from "@/lib/adminActions";

type Entry = {
  _id: string;
  adminEmail: string;
  adminName?: string;
  action: string;
  targetType: "USER" | "BUSINESS" | "LISTING" | "DEAL" | "REPORT" | "ANNOUNCEMENT";
  targetLabel?: string;
  details?: string;
  createdAt: string;
};
type Filter = "" | Entry["targetType"];

const TONE: Record<Entry["targetType"], Tone> = { USER: "blue", BUSINESS: "violet", LISTING: "neutral", DEAL: "orange", REPORT: "red", ANNOUNCEMENT: "green" };
const fmt = (d: string) => new Date(d).toLocaleString("en-PK", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

const CLEAR_CHOICES = [
  { id: "30", label: "Older than 30 days", hint: "Keeps the last month" },
  { id: "90", label: "Older than 90 days", hint: "Keeps the last three months" },
  { id: "all", label: "Everything", hint: "Deletes the whole history" },
] as const;

/** Platform owner only: deletes old admin activity (older than 30 or 90 days, or everything). */
function ClearHistoryDialog({ open, onOpenChange, onCleared }: { open: boolean; onOpenChange: (o: boolean) => void; onCleared: (n: number) => void }) {
  const [choice, setChoice] = useState<(typeof CLEAR_CHOICES)[number]["id"]>("90");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function clear() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/activity${choice === "all" ? "" : `?olderThan=${choice}`}`, { method: "DELETE" });
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
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600"><Trash2 size={18} /></span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-base font-semibold text-slate-900">Delete activity history</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">Deleted entries can&apos;t be brought back. The deletion itself is recorded.</Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></Dialog.Close>
          </div>
          <div role="radiogroup" aria-label="What to delete" className="mt-5 space-y-1.5">
            {CLEAR_CHOICES.map(c => (
              <button key={c.id} type="button" role="radio" aria-checked={choice === c.id} onClick={() => setChoice(c.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${choice === c.id ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200 hover:border-slate-300"}`}>
                <span className={`h-4 w-4 flex-shrink-0 rounded-full border-2 ${choice === c.id ? "border-[5px] border-slate-900" : "border-slate-300"}`} />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{c.label}</span>
                  <span className="block text-xs text-slate-500">{c.hint}</span>
                </span>
              </button>
            ))}
          </div>
          {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild><button type="button" disabled={busy} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50">Cancel</button></Dialog.Close>
            <button type="button" onClick={clear} disabled={busy} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">{busy ? "Deleting…" : "Delete history"}</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Admin action log: who changed what, and when. The platform owner can delete old history. */
export default function AdminActivityPage() {
  const [type, setType] = useState<Filter>("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ entries: Entry[]; total: number; pages: number; canClear?: boolean } | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (type) params.set("type", type);
    if (q.trim()) params.set("q", q.trim());
    const t = setTimeout(() => {
      fetch(`/api/admin/activity?${params}`).then(r => r.json()).then(setData).catch(() => setData({ entries: [], total: 0, pages: 1 }));
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [type, q, page, reload]);

  return (
    <div>
      <ClearHistoryDialog open={clearOpen} onOpenChange={setClearOpen}
        onCleared={n => { setClearOpen(false); setNotice(n ? `Deleted ${n.toLocaleString()} entr${n === 1 ? "y" : "ies"}.` : "Nothing to delete for that choice."); setPage(1); setReload(x => x + 1); }} />
      <PageHeader title="Activity" description="Every change made from the admin panel: who did it, to what, and when."
        actions={data?.canClear ? (
          <button type="button" onClick={() => { setNotice(""); setClearOpen(true); }} className={`${btn.base} ${btn.danger} px-3 py-2 text-[13px]`}>
            <Trash2 size={14} /> Delete history
          </button>
        ) : undefined} />
      {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">{notice}</p>}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Segmented<Filter>
          value={type}
          onChange={v => { setPage(1); setType(v); }}
          options={[
            { value: "", label: "All" },
            { value: "USER", label: "Users" },
            { value: "BUSINESS", label: "Businesses" },
            { value: "LISTING", label: "Listings" },
            { value: "DEAL", label: "Deals" },
            { value: "REPORT", label: "Reports" },
            { value: "ANNOUNCEMENT", label: "Announcements" },
          ]}
        />
        <SearchField value={q} onChange={v => { setPage(1); setQ(v); }} placeholder="Admin, name or details…" />
      </div>

      <Panel>
        {data === null ? (
          <div className="space-y-px">{[1, 2, 3, 4].map(i => <div key={i} className="h-14 animate-pulse bg-slate-50" />)}</div>
        ) : data.entries.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <History size={28} strokeWidth={1.5} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-900">No activity yet</p>
            <p className="mt-1 text-[13px] text-slate-500">Admin actions such as suspensions, plan changes and removals are recorded here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.entries.map(e => (
              <li key={e._id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm text-slate-900">
                    <span className="font-semibold">{ADMIN_ACTION_LABEL[e.action] ?? e.action}</span>
                    {e.targetLabel && <span className="truncate text-slate-600">· {e.targetLabel}</span>}
                    <Badge tone={TONE[e.targetType]}>{e.targetType.toLowerCase()}</Badge>
                  </p>
                  {e.details && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{e.details}</p>}
                </div>
                <p className="flex-shrink-0 text-xs text-slate-400 sm:text-right">
                  <span className="font-medium text-slate-600">{e.adminName || e.adminEmail}</span>
                  <span className="block">{fmt(e.createdAt)}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>{data.total.toLocaleString()} actions</span>
          <span className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className={`${btn.base} ${btn.secondary}`}>Newer</button>
            <span className="self-center">Page {page} of {data.pages}</span>
            <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} className={`${btn.base} ${btn.secondary}`}>Older</button>
          </span>
        </div>
      )}
    </div>
  );
}
