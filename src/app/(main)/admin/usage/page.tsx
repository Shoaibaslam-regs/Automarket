"use client";

import { useEffect, useState } from "react";
import { Database, HardDrive, RefreshCw, TriangleAlert } from "lucide-react";
import { DataTable, PageHeader, Panel, btn } from "@/components/admin/ui";
import {
  formatBytes, percentText, usageLevel, usagePercent,
  type CollectionUsage, type SystemUsage, type UsageLevel,
} from "@/lib/usageMeter";

const BAR: Record<UsageLevel, string> = { ok: "bg-emerald-500", warn: "bg-amber-500", danger: "bg-rose-600", unknown: "bg-slate-300" };
const LEVEL_TEXT: Record<UsageLevel, string> = { ok: "text-emerald-600", warn: "text-amber-600", danger: "text-rose-600", unknown: "text-slate-500" };

function ago(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  return `${Math.round(min / 60)} h ago`;
}

/** One service: what is used of what, a coloured bar, and a few detail lines. */
function Meter({
  title, icon: Icon, used, limit, details, advice, error,
}: {
  title: string;
  icon: typeof Database;
  used?: number;
  limit?: number;
  details?: { label: string; value: string }[];
  advice?: { warn: string; danger: string };
  error?: string;
}) {
  const level = error || used == null ? "unknown" : usageLevel(used, limit);
  return (
    <Panel bodyClassName="p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {!error && used != null && <span className={`ml-auto text-sm font-bold tabular-nums ${LEVEL_TEXT[level]}`}>{percentText(used, limit)}</span>}
      </div>
      {error ? (
        <p className="mt-4 flex items-center gap-1.5 text-sm text-rose-600"><TriangleAlert size={14} /> {error}</p>
      ) : used != null ? (
        <>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {formatBytes(used)} <span className="text-sm font-medium text-slate-400">of {limit ? formatBytes(limit) : "no limit"}</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(usagePercent(used, limit))} aria-label={`${title} used`}>
            <div className={`h-full rounded-full transition-[width] duration-500 ${BAR[level]}`} style={{ width: `${Math.max(usagePercent(used, limit), used > 0 ? 1 : 0)}%` }} />
          </div>
          {details && (
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {details.map(d => (
                <div key={d.label} className="min-w-0">
                  <dt className="text-slate-400">{d.label}</dt>
                  <dd className="truncate font-semibold text-slate-700 tabular-nums">{d.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {advice && (level === "warn" || level === "danger") && (
            <p className={`mt-4 flex items-start gap-1.5 text-xs leading-relaxed ${LEVEL_TEXT[level]}`}>
              <TriangleAlert size={13} className="mt-px flex-shrink-0" /> {level === "danger" ? advice.danger : advice.warn}
            </p>
          )}
        </>
      ) : (
        <div className="mt-4 space-y-2"><div className="h-6 w-1/2 animate-pulse rounded bg-slate-100" /><div className="h-2 animate-pulse rounded bg-slate-100" /></div>
      )}
    </Panel>
  );
}

/** Database and UploadThing storage against their limits, read every 10 minutes (or on Refresh). */
export default function AdminUsagePage() {
  const [data, setData] = useState<SystemUsage | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    fetch("/api/admin/usage")
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  async function refresh() {
    setRefreshing(true);
    setNote("");
    const res = await fetch("/api/admin/usage?refresh=1").catch(() => null);
    const body = await res?.json().catch(() => null);
    setRefreshing(false);
    if (res?.ok) { setData(body); setFailed(false); }
    else setNote(body?.error || "Couldn't refresh. Try again in a moment.");
  }

  const db = data?.db;
  const up = data?.uploads;

  return (
    <div>
      <PageHeader
        title="System usage"
        description="How much of the database and file storage is used. Checked every 10 minutes."
        actions={
          <>
            {data && <span className="text-xs text-slate-400">Checked {ago(data.checkedAt)}</span>}
            <button type="button" onClick={refresh} disabled={refreshing} className={`${btn.base} ${btn.secondary} px-3 py-2 text-[13px]`}>
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Checking…" : "Refresh"}
            </button>
          </>
        }
      />
      {note && <p className="mb-4 text-sm text-rose-600">{note}</p>}
      {failed && !data && <p className="mb-4 text-sm text-rose-600">Couldn&apos;t load usage. Try Refresh.</p>}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Meter
          title="Database (MongoDB)"
          icon={Database}
          error={db && !db.ok ? db.error : undefined}
          used={db?.ok ? db.usedBytes : undefined}
          limit={db?.ok ? db.limitBytes : undefined}
          details={db?.ok ? [
            { label: "Data", value: formatBytes(db.dataBytes) },
            { label: "Indexes", value: formatBytes(db.indexBytes) },
            { label: "On disk (compressed)", value: formatBytes(db.storageBytes) },
            { label: "Documents", value: db.documents.toLocaleString("en-PK") },
          ] : undefined}
          advice={{
            warn: "Getting full. Check the biggest collections below; old error logs and rate-limit records clear themselves, but listings, messages and bookings keep growing.",
            danger: "Almost full: the database refuses new writes at the limit, so sign-ups, listings and messages would fail. Move to a bigger Atlas tier soon.",
          }}
        />
        <Meter
          title="File storage (UploadThing)"
          icon={HardDrive}
          error={up && !up.ok ? up.error : undefined}
          used={up?.ok ? up.accountBytes : undefined}
          limit={up?.ok ? up.limitBytes : undefined}
          details={up?.ok ? [
            { label: "This app", value: formatBytes(up.appBytes) },
            { label: "Files", value: up.files.toLocaleString("en-PK") },
            { label: "Whole account", value: formatBytes(up.accountBytes) },
            { label: "Plan limit", value: formatBytes(up.limitBytes) },
          ] : undefined}
          advice={{
            warn: "Getting full. Photos of deleted listings and accounts are removed automatically; upgrading the UploadThing plan raises the limit.",
            danger: "Almost full: new photo uploads will fail at the limit. Upgrade the UploadThing plan soon.",
          }}
        />
      </div>

      {db?.ok && (
        <>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Collections, biggest first</h2>
          <DataTable<CollectionUsage>
            cols="md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]"
            rows={db.collections}
            rowKey={c => c.name}
            empty="No collections yet."
            columns={[
              { header: "Collection", cell: c => <p className="truncate text-sm font-semibold text-slate-900">{c.name}</p> },
              { header: "Documents", align: "right", cell: c => <span className="text-sm tabular-nums text-slate-700">{c.documents.toLocaleString("en-PK")}</span> },
              { header: "Data", align: "right", cell: c => <span className="text-sm tabular-nums text-slate-700">{c.dataBytes == null ? "—" : formatBytes(c.dataBytes)}</span> },
              { header: "Indexes", align: "right", cell: c => <span className="text-sm tabular-nums text-slate-500">{c.indexBytes == null ? "—" : formatBytes(c.indexBytes)}</span> },
            ]}
          />
        </>
      )}
    </div>
  );
}
