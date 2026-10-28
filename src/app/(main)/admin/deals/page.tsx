"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Ban, CircleCheck, ExternalLink, ImageOff, Tag, Trash2 } from "lucide-react";
import { Badge, ConfirmDialog, DataTable, PageHeader, SearchField, SelectField, StatCard, StatGrid, btn, type Tone } from "@/components/admin/ui";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { DEAL_STATE_STYLE, dealLabel, dealPrice, dealState, type DealState } from "@/lib/deals";
import { formatLakh } from "@/lib/format";

type AdminDeal = {
  _id: string;
  title: string;
  description?: string;
  discountType: "PERCENT" | "AMOUNT";
  discountValue: number;
  dealType?: "SALE" | "RENT";
  vehicleCount?: number;
  make: string;
  model: string;
  year: number;
  location: string;
  images: string[];
  price: number;
  startsAt: string;
  endsAt: string;
  paused: boolean;
  disabledByAdmin: boolean;
  organizationId?: { _id: string; name: string; slug: string; city?: string } | null;
  createdBy?: { name?: string; email?: string } | null;
};

const STATE_TONE: Record<DealState, Tone> = { LIVE: "green", SCHEDULED: "blue", EXPIRED: "neutral", PAUSED: "amber", DISABLED: "red" };
const fmt = (d: string) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

export default function AdminDealsPage() {
  // What this admin's role may do here (src/lib/adminRoles.ts)
  const canWrite = useAdminAccess().can("deals");
  const [deals, setDeals] = useState<AdminDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<{ action: "disable" | "enable" | "delete"; deal: AdminDeal } | null>(null);
  const [error, setError] = useState("");

  const load = () =>
    fetch("/api/admin/deals")
      .then(r => r.json())
      .then(d => { setDeals(d.deals || []); setNow(Date.now()); })
      .catch(() => setError("Couldn't load deals."))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  async function run() {
    if (!pending) return;
    const { action, deal } = pending;
    setBusy(deal._id);
    setError("");
    const res = await fetch(`/api/admin/deals/${deal._id}`, action === "delete"
      ? { method: "DELETE" }
      : { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ disabledByAdmin: action === "disable" }) });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error || "Something went wrong");
    setBusy(null);
    setPending(null);
    load();
  }

  const stateOf = (d: AdminDeal) => (now ? dealState(d, now) : "LIVE");
  const q = search.toLowerCase();
  const filtered = deals.filter(d =>
    [d.title, d.organizationId?.name ?? "", `${d.make} ${d.model}`, d.location].some(v => v.toLowerCase().includes(q)) &&
    (!stateFilter || DEAL_STATE_STYLE[stateOf(d)].label === stateFilter)
  );
  const count = (s: DealState) => deals.filter(d => stateOf(d) === s).length;

  return (
    <>
      <PageHeader
        title="Deals"
        description={loading ? "Loading…" : `${deals.length} deal${deals.length !== 1 ? "s" : ""} from businesses`}
        actions={
          <>
            <SearchField value={search} onChange={setSearch} placeholder="Deal, vehicle, city or business…" />
            <SelectField value={stateFilter} onChange={setStateFilter} options={Object.values(DEAL_STATE_STYLE).map(s => s.label)} allLabel="All states" ariaLabel="Filter by state" />
          </>
        }
      />

      {error && <div role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">{error}</div>}

      <StatGrid>
        <StatCard label="Live now" value={count("LIVE")} icon={Tag} tone="green" />
        <StatCard label="Scheduled" value={count("SCHEDULED")} icon={Tag} tone="blue" />
        <StatCard label="Paused" value={count("PAUSED")} icon={Tag} tone="amber" />
        <StatCard label="Disabled by admin" value={count("DISABLED")} icon={Ban} tone="red" />
      </StatGrid>

      <DataTable
        rows={filtered}
        rowKey={d => d._id}
        loading={loading}
        empty="No deals match"
        cols="md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.4fr)_minmax(0,0.9fr)_150px]"
        columns={[
          {
            header: "Deal",
            cell: d => (
              <a href={`/deals/${d._id}`} target="_blank" rel="noreferrer" className="group flex min-w-0 items-center gap-3">
                <span className="relative flex h-11 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-300">
                  {d.images?.[0] ? <Image src={d.images[0]} alt="" fill sizes="56px" className="object-cover" /> : <ImageOff size={16} />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-900 group-hover:underline">{d.title}</span>
                  <span className="block truncate text-xs text-slate-500">
                    <span className="font-semibold text-rose-600">{dealLabel(d)}</span> · {d.dealType === "RENT" ? `Rent${(d.vehicleCount ?? 1) > 1 ? ` (${d.vehicleCount} cars)` : ""} · PKR ${formatLakh(dealPrice(d.price, d))}/day` : `Sale · PKR ${formatLakh(dealPrice(d.price, d))}`} · {d.make} {d.model} {d.year} · {d.location}
                  </span>
                </span>
              </a>
            ),
          },
          {
            header: "Business",
            cell: d => d.organizationId ? (
              <a href={`/dealers/${d.organizationId.slug}`} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 text-sm font-medium text-indigo-700 hover:underline">
                <span className="truncate">{d.organizationId.name}</span> <ExternalLink size={12} className="flex-shrink-0" />
              </a>
            ) : <span className="text-sm text-slate-400">Deleted business</span>,
          },
          { header: "Runs", cell: d => <p className="text-sm tabular-nums text-slate-600">{fmt(d.startsAt)} → {fmt(d.endsAt)}</p> },
          { header: "State", cell: d => <Badge tone={STATE_TONE[stateOf(d)]}>{DEAL_STATE_STYLE[stateOf(d)].label}</Badge> },
          {
            header: "Actions",
            full: true,
            hideLabel: true,
            align: "right",
            cell: d => !canWrite ? (
              <p className="text-xs text-slate-400 md:text-right">View only</p>
            ) : (
              <div className="flex gap-1.5 md:justify-end">
                {d.disabledByAdmin ? (
                  <button onClick={() => setPending({ action: "enable", deal: d })} disabled={busy === d._id} className={`${btn.base} ${btn.secondary} flex-1 md:flex-none`}>
                    <CircleCheck size={13} /> Enable
                  </button>
                ) : (
                  <button onClick={() => setPending({ action: "disable", deal: d })} disabled={busy === d._id} className={`${btn.base} ${btn.warn} flex-1 md:flex-none`}>
                    <Ban size={13} /> Disable
                  </button>
                )}
                <button onClick={() => setPending({ action: "delete", deal: d })} disabled={busy === d._id} aria-label="Delete deal" title="Delete deal" className={`${btn.base} ${btn.danger}`}>
                  <Trash2 size={13} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={o => !o && setPending(null)}
        onConfirm={run}
        loading={pending !== null && busy === pending.deal._id}
        {...(pending?.action === "delete"
          ? { tone: "danger" as const, icon: Trash2, title: `Delete "${pending.deal.title}"?`, description: <>This permanently removes the deal from {pending.deal.organizationId?.name ?? "the business"}. It can&apos;t be undone.</>, confirmLabel: "Delete deal", loadingLabel: "Deleting…" }
          : pending?.action === "disable"
          ? { tone: "warn" as const, icon: Ban, title: `Disable "${pending.deal.title}"?`, description: <>The deal is hidden from the Deals page and the business page. {pending.deal.organizationId?.name ?? "The business"} sees it as disabled by an admin and can&apos;t switch it back on.</>, confirmLabel: "Disable deal", loadingLabel: "Disabling…" }
          : { tone: "neutral" as const, icon: CircleCheck, title: `Enable "${pending?.deal.title ?? "deal"}" again?`, description: <>The deal shows again while it&apos;s within its dates and not paused by the business.</>, confirmLabel: "Enable deal", loadingLabel: "Enabling…" })}
      />
    </>
  );
}
