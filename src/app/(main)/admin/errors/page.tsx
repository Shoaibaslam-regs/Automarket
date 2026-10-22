"use client";

import { useEffect, useState } from "react";
import { Bug, Check, ChevronDown, RotateCcw, Trash2 } from "lucide-react";
import { Badge, ConfirmDialog, PageHeader, Panel, Segmented, btn } from "@/components/admin/ui";
import { useAdminAccess } from "@/components/admin/AdminAccess";

type ErrorEntry = {
  _id: string;
  source: "SERVER" | "CLIENT";
  where: string;
  message: string;
  stack?: string;
  path?: string;
  method?: string;
  digest?: string;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt?: string;
};
type Status = "open" | "fixed" | "all";
type Source = "" | ErrorEntry["source"];
type Data = { errors: ErrorEntry[]; total: number; pages: number; lastDay: { kinds: number; hits: number } };

const fmt = (d: string) => new Date(d).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function ago(d: string): string {
  const min = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

/** Production errors grouped by kind: what broke, where, how often and when last. Admins mark them fixed. */
export default function AdminErrorsPage() {
  const { canWrite } = useAdminAccess();
  const [status, setStatus] = useState<Status>("open");
  const [source, setSource] = useState<Source>("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Data | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ status, page: String(page) });
    if (source) params.set("source", source);
    fetch(`/api/admin/errors?${params}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({ errors: [], total: 0, pages: 1, lastDay: { kinds: 0, hits: 0 } }));
  }, [status, source, page, reload]);

  async function setResolved(id: string, action: "resolve" | "reopen") {
    setBusyId(id);
    const res = await fetch(`/api/admin/errors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    setBusyId(null);
    if (res.ok) setReload(x => x + 1);
  }

  async function clearFixed() {
    setClearing(true);
    await fetch("/api/admin/errors", { method: "DELETE" }).catch(() => {});
    setClearing(false);
    setClearOpen(false);
    setReload(x => x + 1);
  }

  return (
    <div>
      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Delete fixed errors"
        description="Every error marked fixed is deleted. Open errors stay. If a deleted error happens again it comes back as new."
        confirmLabel="Delete fixed"
        loadingLabel="Deleting…"
        loading={clearing}
        onConfirm={clearFixed}
        tone="danger"
        icon={Trash2}
      />
      <PageHeader
        title="Errors"
        description="Things that broke for users in production, grouped by kind. Errors not seen for 30 days are removed automatically."
        actions={canWrite && status === "fixed" && (data?.total ?? 0) > 0 ? (
          <button type="button" onClick={() => setClearOpen(true)} className={`${btn.base} ${btn.danger} px-3 py-2 text-[13px]`}>
            <Trash2 size={14} /> Delete fixed
          </button>
        ) : undefined}
      />

      {data && (
        <p className="mb-4 text-sm text-slate-500">
          Last 24 hours: <strong className="font-semibold text-slate-900">{data.lastDay.kinds}</strong> kind{data.lastDay.kinds === 1 ? "" : "s"} of error,{" "}
          <strong className="font-semibold text-slate-900">{data.lastDay.hits.toLocaleString()}</strong> time{data.lastDay.hits === 1 ? "" : "s"} in total
        </p>
      )}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Segmented<Status>
          value={status}
          onChange={v => { setPage(1); setStatus(v); }}
          options={[{ value: "open", label: "Open" }, { value: "fixed", label: "Fixed" }, { value: "all", label: "All" }]}
        />
        <Segmented<Source>
          value={source}
          onChange={v => { setPage(1); setSource(v); }}
          options={[{ value: "", label: "Everywhere" }, { value: "SERVER", label: "Server" }, { value: "CLIENT", label: "Browser" }]}
        />
      </div>

      <Panel>
        {data === null ? (
          <div className="space-y-px">{[1, 2, 3, 4].map(i => <div key={i} className="h-16 animate-pulse bg-slate-50" />)}</div>
        ) : data.errors.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Bug size={28} strokeWidth={1.5} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-900">{status === "open" ? "No open errors" : "Nothing here"}</p>
            <p className="mt-1 text-[13px] text-slate-500">When something breaks for a user, it shows up here with where it happened and how often.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.errors.map(e => {
              const expanded = openId === e._id;
              return (
                <li key={e._id} className="px-4 py-3 sm:px-6">
                  <div className="flex items-start gap-3">
                    <button type="button" onClick={() => setOpenId(expanded ? null : e._id)} aria-expanded={expanded} className="min-w-0 flex-1 text-left">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm">
                        <span className="font-semibold text-slate-900">{e.where}</span>
                        <Badge tone={e.source === "CLIENT" ? "violet" : "blue"}>{e.source === "CLIENT" ? "browser" : "server"}</Badge>
                        {e.resolvedAt && <Badge tone="green">fixed</Badge>}
                      </p>
                      <p className={`mt-0.5 font-mono text-xs text-rose-700 ${expanded ? "break-words" : "line-clamp-2"}`}>{e.message}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-slate-400">
                        <span><strong className="font-semibold text-slate-700">{e.count.toLocaleString()}×</strong></span>
                        <span>last {ago(e.lastSeenAt)}</span>
                        {e.path && <span className="truncate">{e.method ? `${e.method} ` : ""}{e.path}</span>}
                        <ChevronDown size={13} className={`transition ${expanded ? "rotate-180" : ""}`} />
                      </p>
                    </button>
                    {canWrite && (
                      e.resolvedAt ? (
                        <button type="button" disabled={busyId === e._id} onClick={() => setResolved(e._id, "reopen")} className={`${btn.base} ${btn.secondary} flex-shrink-0`}>
                          <RotateCcw size={13} /> Reopen
                        </button>
                      ) : (
                        <button type="button" disabled={busyId === e._id} onClick={() => setResolved(e._id, "resolve")} className={`${btn.base} ${btn.secondary} flex-shrink-0`}>
                          <Check size={13} /> Fixed
                        </button>
                      )
                    )}
                  </div>
                  {expanded && (
                    <div className="mt-3 space-y-2 text-xs text-slate-500">
                      <p>First seen {fmt(e.firstSeenAt)} · last seen {fmt(e.lastSeenAt)}{e.digest ? ` · Ref ${e.digest}` : ""}</p>
                      {e.stack && (
                        <pre className="theme-static max-h-72 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-200">{e.stack}</pre>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>{data.total.toLocaleString()} errors</span>
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
