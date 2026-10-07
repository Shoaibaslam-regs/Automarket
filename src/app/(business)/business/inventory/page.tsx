"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Car, LayoutGrid, List, MapPin, Plus, Search, Trash2 } from "lucide-react";
import Select from "@/components/ui/Select";

type Vehicle = {
  _id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price: number;
  status: string;
  type: string;
  images: string[];
  mileage?: number;
  color?: string;
  condition: string;
  location: string;
  createdAt: string;
  sellerId?: { _id: string; name?: string } | null;
  canManage: boolean;
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  ACTIVE:   { bg: "#dafbe1", color: "#1a7f37" },
  SOLD:     { bg: "#ddf4ff", color: "#0550ae" },
  PENDING:  { bg: "#fff8c5", color: "#7d4e00" },
  INACTIVE: { bg: "#f6f8fa", color: "#57606a" },
  RENTED:   { bg: "#ffdfb6", color: "#953800" },
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  ...["ACTIVE", "SOLD", "PENDING", "INACTIVE", "RENTED"].map(s => ({ value: s, label: s })),
];

function StatusPill({ status }: { status: string }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.INACTIVE;
  return (
    <span className="inline-flex flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

export default function InventoryPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    // Scoped server-side to the signed-in user's business; never the public marketplace feed
    fetch("/api/business/inventory")
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load inventory");
        setVehicles(d.listings || []);
      })
      .catch(err => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function deleteVehicle(id: string) {
    if (!confirm("Delete this vehicle?")) return;
    setDeleting(id);
    const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
    if (res.ok) {
      setVehicles(prev => prev.filter(v => v._id !== id));
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Failed to delete vehicle");
    }
    setDeleting(null);
  }

  const filtered = vehicles.filter(v => {
    const matchSearch = v.title.toLowerCase().includes(search.toLowerCase()) ||
      v.make.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter ? v.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  const summary = [
    { label: "Total", count: vehicles.length, color: "#0d1117" },
    { label: "Available", count: vehicles.filter(v => v.status === "ACTIVE").length, color: "#1a7f37" },
    { label: "Sold", count: vehicles.filter(v => v.status === "SOLD").length, color: "#0550ae" },
    { label: "Reserved", count: vehicles.filter(v => v.status === "PENDING").length, color: "#7d4e00" },
  ];

  const deleteButton = (v: Vehicle, compact = false) =>
    v.canManage ? (
      <button
        onClick={() => deleteVehicle(v._id)}
        disabled={deleting === v._id}
        aria-label={`Delete ${v.title}`}
        className={`inline-flex items-center justify-center rounded-lg border border-[#ffcdd2] bg-[#fff0f0] text-[#cf222e] transition hover:bg-[#ffe3e3] disabled:opacity-50 ${compact ? "h-8 w-8" : "h-8 px-2.5"}`}
      >
        <Trash2 size={13} strokeWidth={1.75} />
      </button>
    ) : null;

  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e1e4e8] bg-white px-4 py-5 sm:px-6">
        <div className="min-w-0">
          <Link href="/business/dashboard" className="text-xs text-[#57606a] hover:text-[#0d1117]">← Dashboard</Link>
          <h1 className="mt-1 text-lg font-bold text-[#0d1117]">Inventory</h1>
        </div>
        <Link href="/sell" className="inline-flex items-center gap-1.5 rounded-lg bg-[#0d1117] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#24292f]">
          <Plus size={15} strokeWidth={2} /> Add vehicle
        </Link>
      </div>

      <div className="px-4 py-5 sm:px-6">
        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-2.5">
          <div className="relative min-w-0 flex-[1_1_220px]">
            <Search size={15} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8c959f]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search vehicles..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition hover:border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div className="flex flex-[1_1_auto] gap-2.5 sm:flex-none">
            <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">
              <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} ariaLabel="Filter by status" />
            </div>
            <div className="flex h-10 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {(["grid", "list"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  aria-label={v === "grid" ? "Grid view" : "List view"}
                  aria-pressed={view === v}
                  className={`flex w-10 items-center justify-center transition ${view === v ? "bg-[#0d1117] text-white" : "text-[#57606a] hover:bg-slate-50"}`}
                >
                  {v === "grid" ? <LayoutGrid size={15} strokeWidth={1.75} /> : <List size={15} strokeWidth={1.75} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-4 flex flex-wrap gap-2">
          {summary.map(s => (
            <div key={s.label} className="rounded-full border border-[#e1e4e8] bg-white px-3.5 py-1.5 text-xs font-semibold" style={{ color: s.color }}>
              {s.label}: {s.count}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3.5">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-[240px] animate-pulse rounded-2xl bg-white" />)}
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-[#ffcdd2] bg-[#fff0f0] p-6 text-center text-sm text-[#cf222e]">{loadError}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-[#e1e4e8] bg-white px-6 py-16 text-center">
            <div className="mb-3 flex justify-center text-[#8c959f]"><Car size={32} strokeWidth={1.5} /></div>
            <p className="mb-2 text-[15px] font-semibold text-[#0d1117]">No vehicles found</p>
            <Link href="/sell" className="text-[13px] font-semibold text-[#0d1117]">Add your first vehicle →</Link>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-3.5 min-[420px]:grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
            {filtered.map(v => (
              <div key={v._id} className="flex flex-col overflow-hidden rounded-2xl border border-[#e1e4e8] bg-white transition hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.25)]">
                <div className="relative aspect-[4/3] overflow-hidden bg-[#f6f8fa]">
                  {v.images?.[0] ? (
                    <Image src={v.images[0]} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#8c959f]"><Car size={25} strokeWidth={1.5} /></div>
                  )}
                  <span className="absolute left-2 top-2"><StatusPill status={v.status} /></span>
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <p className="truncate text-[13px] font-bold text-[#0d1117]">{v.title}</p>
                  <p className="mb-2 truncate text-[11px] text-[#8c959f]">
                    {v.make} {v.model} · {v.year}{v.mileage != null && ` · ${v.mileage.toLocaleString()} km`}
                  </p>
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-extrabold text-[#0d1117]">PKR {v.price.toLocaleString()}</span>
                    <span className="flex-shrink-0 text-[10px] text-[#8c959f]">{v.condition}</span>
                  </div>
                  {!v.canManage && v.sellerId?.name && (
                    <p className="mb-2 truncate text-[11px] text-[#57606a]">Listed by {v.sellerId.name}</p>
                  )}
                  <div className="mt-auto flex gap-1.5">
                    <Link href={`/listings/${v._id}`} className="flex h-8 flex-1 items-center justify-center rounded-lg border border-[#e1e4e8] bg-[#f6f8fa] text-[11px] font-semibold text-[#0d1117] transition hover:bg-[#eef1f4]">
                      View
                    </Link>
                    {deleteButton(v)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#e1e4e8] bg-white">
            {filtered.map((v, i) => (
              <div key={v._id} className={`flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-5 ${i < filtered.length - 1 ? "border-b border-[#f0f2f4]" : ""}`}>
                <div className="relative h-11 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-[#f6f8fa] sm:w-16">
                  {v.images?.[0]
                    ? <Image src={v.images[0]} alt="" fill sizes="64px" className="object-cover" />
                    : <div className="flex h-full w-full items-center justify-center text-[#8c959f]"><Car size={14} strokeWidth={1.5} /></div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[#0d1117]">{v.title}</p>
                  <p className="flex min-w-0 items-center gap-1 truncate text-[11px] text-[#8c959f]">
                    {v.make} · {v.year}{v.mileage != null && ` · ${v.mileage.toLocaleString()} km`}
                    {v.location && <span className="hidden items-center gap-0.5 md:inline-flex"> · <MapPin size={10} />{v.location}</span>}
                  </p>
                  {/* On small screens status + price move under the title instead of overflowing the row */}
                  <div className="mt-1 flex items-center gap-2 sm:hidden">
                    <StatusPill status={v.status} />
                    <span className="truncate text-[13px] font-bold text-[#0d1117]">PKR {v.price.toLocaleString()}</span>
                  </div>
                </div>
                <span className="hidden sm:inline-flex"><StatusPill status={v.status} /></span>
                <p className="hidden flex-shrink-0 text-sm font-bold text-[#0d1117] sm:block">PKR {v.price.toLocaleString()}</p>
                <div className="flex flex-shrink-0 gap-1.5">
                  <Link href={`/listings/${v._id}`} className="inline-flex h-8 items-center rounded-lg border border-[#e1e4e8] bg-[#f6f8fa] px-2.5 text-[11px] font-semibold text-[#0d1117] hover:bg-[#eef1f4]">View</Link>
                  {deleteButton(v, true)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
