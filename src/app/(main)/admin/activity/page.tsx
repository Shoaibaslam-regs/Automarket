"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { Badge, PageHeader, Panel, SearchField, Segmented, btn, type Tone } from "@/components/admin/ui";
import { ADMIN_ACTION_LABEL } from "@/lib/adminActions";

type Entry = {
  _id: string;
  adminEmail: string;
  adminName?: string;
  action: string;
  targetType: "USER" | "BUSINESS" | "LISTING" | "DEAL" | "REPORT";
  targetLabel?: string;
  details?: string;
  createdAt: string;
};
type Filter = "" | Entry["targetType"];

const TONE: Record<Entry["targetType"], Tone> = { USER: "blue", BUSINESS: "violet", LISTING: "neutral", DEAL: "orange", REPORT: "red" };
const fmt = (d: string) => new Date(d).toLocaleString("en-PK", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/** Admin action log: who changed what, and when. Read-only. */
export default function AdminActivityPage() {
  const [type, setType] = useState<Filter>("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ entries: Entry[]; total: number; pages: number } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (type) params.set("type", type);
    if (q.trim()) params.set("q", q.trim());
    const t = setTimeout(() => {
      fetch(`/api/admin/activity?${params}`).then(r => r.json()).then(setData).catch(() => setData({ entries: [], total: 0, pages: 1 }));
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [type, q, page]);

  return (
    <div>
      <PageHeader title="Activity" description="Every change made from the admin panel: who did it, to what, and when." />
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
