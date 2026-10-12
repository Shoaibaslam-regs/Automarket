"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Pause, Pencil, Percent, Play, Plus, Tag, Trash2, X } from "lucide-react";
import ConfirmDialog from "@/components/business/ConfirmDialog";
import { DEAL_STATE_STYLE, MAX_PERCENT, dealLabel, dealPrice, dealState } from "@/lib/deals";

type Deal = {
  _id: string;
  title: string;
  description?: string;
  discountType: "PERCENT" | "AMOUNT";
  discountValue: number;
  listingIds: string[];
  startsAt: string;
  endsAt: string;
  paused: boolean;
  disabledByAdmin: boolean;
  createdBy?: { name?: string } | null;
};
type Vehicle = { id: string; title: string; price: number; image: string | null };

const toInputDate = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const fmt = (d: string) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

const blankForm = () => {
  const end = new Date();
  end.setDate(end.getDate() + 14);
  return { title: "", description: "", discountType: "PERCENT" as "PERCENT" | "AMOUNT", discountValue: "10", scope: "ALL" as "ALL" | "PICK", listingIds: [] as string[], startsAt: toInputDate(new Date()), endsAt: toInputDate(end) };
};

function DealDialog({ open, onOpenChange, vehicles, editing, onSaved }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vehicles: Vehicle[];
  editing: Deal | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // Fill the form when a different deal (or a new one) is opened
  const key = open ? editing?._id ?? "new" : null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    setError("");
    setForm(editing ? {
      title: editing.title,
      description: editing.description ?? "",
      discountType: editing.discountType,
      discountValue: String(editing.discountValue),
      scope: editing.listingIds.length ? "PICK" : "ALL",
      listingIds: editing.listingIds.map(String),
      startsAt: toInputDate(new Date(editing.startsAt)),
      endsAt: toInputDate(new Date(editing.endsAt)),
    } : blankForm());
  }

  const set = <K extends keyof ReturnType<typeof blankForm>>(k: K, v: ReturnType<typeof blankForm>[K]) => setForm(p => ({ ...p, [k]: v }));
  const toggleVehicle = (id: string) => set("listingIds", form.listingIds.includes(id) ? form.listingIds.filter(x => x !== id) : [...form.listingIds, id]);
  const value = Number(form.discountValue) || 0;
  const previewVehicle = (form.scope === "PICK" ? vehicles.find(v => form.listingIds.includes(v.id)) : vehicles[0]) ?? null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (form.scope === "PICK" && form.listingIds.length === 0) { setError("Pick at least one vehicle, or apply the deal to all vehicles"); return; }
    setSaving(true);
    setError("");
    const res = await fetch(editing ? `/api/business/deals/${editing._id}` : "/api/business/deals", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        discountType: form.discountType,
        discountValue: value,
        listingIds: form.scope === "PICK" ? form.listingIds : [],
        startsAt: form.startsAt,
        endsAt: form.endsAt,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setError(data.error || "Failed to save deal"); return; }
    onSaved();
  }

  const input = "h-10 w-full rounded-lg border border-[#d0d7de] bg-white px-3 text-[13px] text-[#0d1117] outline-none focus:border-[#0d1117] focus:ring-2 focus:ring-[#0d1117]/10";
  const label = "mb-1.5 block text-xs font-semibold text-[#0d1117]";

  return (
    <Dialog.Root open={open} onOpenChange={o => !saving && onOpenChange(o)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] flex max-h-[calc(100vh-32px)] w-[calc(100%-32px)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl focus:outline-none">
          <div className="flex items-center justify-between border-b border-[#e1e4e8] px-5 py-4">
            <Dialog.Title className="flex items-center gap-2.5 text-[15px] font-bold text-[#0d1117]">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white"><Tag size={15} /></span>
              {editing ? "Edit deal" : "New deal"}
            </Dialog.Title>
            <Dialog.Close aria-label="Close" className="rounded-full p-1 text-[#8c959f] hover:bg-[#f6f8fa]"><X size={18} /></Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Set a discount on your vehicles for a period. Deals show on your listings and business page.</Dialog.Description>

          <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
            <div className="space-y-4 overflow-y-auto px-5 py-5">
              <div>
                <label className={label} htmlFor="deal-title">Title *</label>
                <input id="deal-title" required maxLength={80} value={form.title} onChange={e => set("title", e.target.value)} placeholder="Eid special, Year-end clearance…" className={input} />
              </div>
              <div>
                <label className={label} htmlFor="deal-desc">Details</label>
                <input id="deal-desc" maxLength={500} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Free first service, registration included…" className={input} />
              </div>

              <div className="grid grid-cols-[1fr_140px] gap-3">
                <div>
                  <span className={label}>Discount *</span>
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#f6f8fa] p-1 ring-1 ring-inset ring-[#e1e4e8]">
                    {(["PERCENT", "AMOUNT"] as const).map(t => (
                      <button key={t} type="button" onClick={() => set("discountType", t)} aria-pressed={form.discountType === t}
                        className={`flex h-8 items-center justify-center gap-1 rounded-md text-xs font-semibold ${form.discountType === t ? "bg-[#0d1117] text-white" : "text-[#57606a]"}`}>
                        {t === "PERCENT" ? <><Percent size={12} /> Percent</> : "PKR amount"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={label} htmlFor="deal-value">{form.discountType === "PERCENT" ? `% off (max ${MAX_PERCENT})` : "PKR off"}</label>
                  <input id="deal-value" type="number" required min={1} max={form.discountType === "PERCENT" ? MAX_PERCENT : undefined} step={1}
                    value={form.discountValue} onChange={e => set("discountValue", e.target.value)} className={input} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label} htmlFor="deal-start">Starts *</label>
                  <input id="deal-start" type="date" required value={form.startsAt} onChange={e => set("startsAt", e.target.value)} className={input} />
                </div>
                <div>
                  <label className={label} htmlFor="deal-end">Ends *</label>
                  <input id="deal-end" type="date" required min={form.startsAt} value={form.endsAt} onChange={e => set("endsAt", e.target.value)} className={input} />
                </div>
              </div>

              <div>
                <span className={label}>Applies to</span>
                <div className="grid grid-cols-2 gap-2">
                  {([["ALL", "All vehicles for sale"], ["PICK", "Chosen vehicles"]] as const).map(([v, t]) => (
                    <button key={v} type="button" onClick={() => set("scope", v)} aria-pressed={form.scope === v}
                      className={`rounded-lg px-3 py-2.5 text-left text-xs font-semibold ring-1 ring-inset ${form.scope === v ? "bg-rose-50 text-rose-700 ring-2 ring-rose-500" : "text-[#57606a] ring-[#e1e4e8] hover:bg-[#f6f8fa]"}`}>
                      {t}
                    </button>
                  ))}
                </div>
                {form.scope === "PICK" && (
                  <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-[#e1e4e8] p-1.5">
                    {vehicles.length === 0 ? (
                      <p className="p-3 text-center text-xs text-[#8c959f]">No vehicles for sale yet.</p>
                    ) : vehicles.map(v => {
                      const on = form.listingIds.includes(v.id);
                      return (
                        <button key={v.id} type="button" onClick={() => toggleVehicle(v.id)} aria-pressed={on}
                          className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-xs ${on ? "bg-rose-50" : "hover:bg-[#f6f8fa]"}`}>
                          <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${on ? "border-rose-600 bg-rose-600 text-white" : "border-[#d0d7de]"}`}>{on && <Check size={11} />}</span>
                          <span className="min-w-0 flex-1 truncate font-medium text-[#0d1117]">{v.title}</span>
                          <span className="tabular-nums text-[#57606a]">PKR {v.price.toLocaleString()}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {previewVehicle && value > 0 && (
                <div className="rounded-xl bg-[#0d1117] p-4 text-white">
                  <p className="text-[11px] uppercase tracking-wider text-white/50">Preview · {previewVehicle.title}</p>
                  <p className="mt-1 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-rose-300">PKR {dealPrice(previewVehicle.price, { discountType: form.discountType, discountValue: value }).toLocaleString()}</span>
                    <span className="text-xs text-white/50 line-through">PKR {previewVehicle.price.toLocaleString()}</span>
                    <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold">{dealLabel({ discountType: form.discountType, discountValue: value })}</span>
                  </p>
                </div>
              )}

              {error && <div role="alert" className="rounded-lg border border-[#ffcdd2] bg-[#fff0f0] px-3 py-2.5 text-[13px] text-[#cf222e]">{error}</div>}
            </div>
            <div className="flex justify-end gap-2 border-t border-[#e1e4e8] px-5 py-4">
              <Dialog.Close asChild>
                <button type="button" disabled={saving} className="rounded-lg border border-[#e1e4e8] bg-[#f6f8fa] px-4 py-2 text-[13px] font-semibold text-[#0d1117]">Cancel</button>
              </Dialog.Close>
              <button type="submit" disabled={saving} className="rounded-lg bg-rose-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
                {saving ? "Saving…" : editing ? "Save deal" : "Create deal"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function BusinessDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Deal | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  const load = () =>
    fetch("/api/business/deals")
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load deals");
        setDeals(d.deals || []);
        setVehicles(d.vehicles || []);
        setCanManage(!!d.permissions?.canManage);
        setNow(Date.now());
      })
      .catch(e => setPageError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  async function togglePause(d: Deal) {
    setBusy(d._id);
    setPageError("");
    const res = await fetch(`/api/business/deals/${d._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paused: !d.paused }) });
    setBusy(null);
    if (!res.ok) setPageError((await res.json().catch(() => ({}))).error || "Failed to update deal");
    load();
  }

  async function remove() {
    const d = confirmDelete;
    if (!d) return;
    setBusy(d._id);
    const res = await fetch(`/api/business/deals/${d._id}`, { method: "DELETE" });
    setBusy(null);
    setConfirmDelete(null);
    if (!res.ok) setPageError((await res.json().catch(() => ({}))).error || "Failed to delete deal");
    load();
  }

  const vehicleTitle = (id: string) => vehicles.find(v => v.id === String(id))?.title;
  const live = deals.filter(d => now && dealState(d, now) === "LIVE").length;

  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      <DealDialog
        open={dialogOpen}
        onOpenChange={o => { setDialogOpen(o); if (!o) setEditing(null); }}
        vehicles={vehicles}
        editing={editing}
        onSaved={() => { setDialogOpen(false); setEditing(null); load(); }}
      />
      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={o => !o && setConfirmDelete(null)}
        title={`Delete "${confirmDelete?.title ?? "deal"}"`}
        description="The deal disappears from your listings and business page straight away. This can't be undone."
        confirmLabel="Delete deal"
        loading={confirmDelete !== null && busy === confirmDelete._id}
        onConfirm={remove}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e1e4e8] bg-white px-4 py-5 sm:px-6">
        <div>
          <Link href="/business/dashboard" className="text-xs text-[#57606a] hover:text-[#0d1117]">← Dashboard</Link>
          <h1 className="mt-1 text-lg font-bold text-[#0d1117]">Deals</h1>
          <p className="mt-0.5 text-xs text-[#57606a]">Discounts shown on your listings and business page · {live} live now</p>
        </div>
        {canManage && (
          <button onClick={() => { setEditing(null); setDialogOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-rose-700">
            <Plus size={15} /> New deal
          </button>
        )}
      </div>

      <div className="px-4 py-5 sm:px-6">
        {pageError && <div role="alert" className="mb-4 rounded-xl border border-[#ffcdd2] bg-[#fff0f0] px-4 py-3 text-[13px] text-[#cf222e]">{pageError}</div>}
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">{[1, 2].map(i => <div key={i} className="h-40 animate-pulse rounded-2xl bg-white" />)}</div>
        ) : deals.length === 0 ? (
          <div className="rounded-2xl border border-[#e1e4e8] bg-white px-6 py-14 text-center">
            <div className="mb-3 flex justify-center text-rose-500"><Tag size={30} strokeWidth={1.5} /></div>
            <p className="text-sm font-semibold text-[#0d1117]">No deals yet</p>
            <p className="mt-1 text-[13px] text-[#57606a]">Run a discount to attract buyers. It appears on your listings and business page.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {deals.map(d => {
              const state = now ? dealState(d, now) : "LIVE";
              const st = DEAL_STATE_STYLE[state];
              return (
                <div key={d._id} className={`overflow-hidden rounded-2xl border bg-white ${state === "LIVE" ? "border-rose-200" : "border-[#e1e4e8]"}`}>
                  <div className={`flex items-center justify-between gap-3 px-4 py-3 ${state === "LIVE" ? "bg-gradient-to-r from-rose-600 to-orange-500 text-white" : "bg-[#f6f8fa] text-[#0d1117]"}`}>
                    <p className="text-xl font-extrabold">{dealLabel(d)}</p>
                    <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-[#0d1117]">{d.title}</p>
                    {d.description && <p className="mt-0.5 text-[13px] text-[#57606a]">{d.description}</p>}
                    <p className="mt-2 text-xs text-[#57606a]">{fmt(d.startsAt)} → {fmt(d.endsAt)}</p>
                    <p className="mt-1 truncate text-xs text-[#57606a]">
                      {d.listingIds.length === 0 ? "All vehicles for sale" : d.listingIds.map(id => vehicleTitle(id) ?? "Vehicle no longer for sale").join(", ")}
                    </p>
                    {state === "DISABLED" && <p className="mt-2 text-xs font-semibold text-[#cf222e]">An AutoMarket admin switched this deal off. Contact the team if you think that&apos;s a mistake.</p>}
                    {canManage && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <button onClick={() => { setEditing(d); setDialogOpen(true); }} disabled={busy === d._id} className="inline-flex items-center gap-1 rounded-lg border border-[#e1e4e8] bg-[#f6f8fa] px-2.5 py-1.5 text-xs font-semibold text-[#0d1117] disabled:opacity-50">
                          <Pencil size={12} /> Edit
                        </button>
                        {!d.disabledByAdmin && state !== "EXPIRED" && (
                          <button onClick={() => togglePause(d)} disabled={busy === d._id} className="inline-flex items-center gap-1 rounded-lg border border-[#e1e4e8] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0d1117] disabled:opacity-50">
                            {d.paused ? <><Play size={12} /> Resume</> : <><Pause size={12} /> Pause</>}
                          </button>
                        )}
                        <button onClick={() => setConfirmDelete(d)} disabled={busy === d._id} className="inline-flex items-center gap-1 rounded-lg border border-[#ffcdd2] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#cf222e] disabled:opacity-50">
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                    {d.createdBy?.name && <p className="mt-2 text-[10px] text-[#8c959f]">Created by {d.createdBy.name}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
