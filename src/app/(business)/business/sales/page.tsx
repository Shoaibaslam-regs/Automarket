"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  BadgeDollarSign, CalendarClock, Car, CheckCircle2, Clock3, Download, FileText, Handshake, MessageCircle, MoreHorizontal, Phone, Plus, Search,
  Store, Trash2, UserRound, Wallet, X, type LucideIcon,
} from "lucide-react";
import Select from "@/components/ui/Select";
import ConfirmDialog from "@/components/business/ConfirmDialog";
import { PaymentDialog, PaymentTag } from "@/components/bookings/PaymentTag";
import { refreshNotificationCounts } from "@/hooks/useNotificationCounts";
import { formatCnicInput } from "@/lib/plates";
import { formatLakh } from "@/lib/format";
import type { PaymentStatus } from "@/lib/payments";
import {
  OPEN_PURCHASE_STATUSES, PURCHASE_LABEL, PURCHASE_STATUSES, PURCHASE_STYLE, REMOVABLE_PURCHASE_STATUSES, asPayable, purchaseNumber, purchasePayment, salePrice,
  type PurchaseStatus,
} from "@/lib/purchases";
import type { InstallmentPlan } from "@/lib/installments";
import { InstallmentLine, InstallmentScheduleDialog, InstallmentSetupDialog } from "@/components/sales/Installments";
import Tip from "@/components/ui/Tip";
import { useQuickNew } from "@/components/business/QuickNew";
import StatusText from "@/components/ui/StatusText";

type Sale = {
  _id: string;
  status: PurchaseStatus;
  source: "ONLINE" | "WALK_IN";
  listingId?: string;
  dealId?: string;
  vehicle: { title: string; make?: string; model?: string; year?: number; image?: string };
  buyer: { name: string; phone: string; email?: string; cnic?: string };
  askingPrice: number;
  offerPrice?: number;
  agreedPrice?: number;
  amountPaid?: number;
  plateNumber?: string;
  installmentPlan?: InstallmentPlan | null;
  message?: string;
  notes?: string;
  declineReason?: string;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
  createdBy?: { name?: string } | null;
  handledBy?: { name?: string } | null;
};
type Stats = { requests: number; accepted: number; soldThisMonth: number; revenueThisMonth: number; revenueTotal: number; outstanding: number };
type Vehicle = { value: string; title: string; price: number };
type ActionKind = "accept" | "decline" | "complete";

const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString()}`;
const fmt = (d: string) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
const field = "h-10 w-full rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-3 text-[13px] text-[var(--gh-0d1117)] outline-none placeholder:text-[var(--gh-8c959f)] focus:border-[var(--gh-0d1117)]";
const label = "mb-1 block text-xs font-semibold text-[var(--gh-0d1117)]";

function DialogShell({ open, onOpenChange, busy, icon: Icon, title, description, children }: {
  open: boolean; onOpenChange: (o: boolean) => void; busy: boolean; icon: LucideIcon; title: string; description: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={o => !busy && onOpenChange(o)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-slate-950/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] max-h-[calc(100vh-32px)] w-[calc(100%-32px)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start gap-3">
            <span className="flex flex-shrink-0 items-center justify-center text-[var(--gh-0d1117)]"><Icon size={18} /></span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-base font-semibold text-[var(--gh-0d1117)]">{title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[var(--gh-57606a)]">{description}</Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="rounded-full p-1 text-[var(--gh-8c959f)] hover:bg-[var(--gh-f6f8fa)]"><X size={18} /></Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Footer({ busy, error, confirm, danger, disabled }: { busy: boolean; error: string; confirm: string; danger?: boolean; disabled?: boolean }) {
  return (
    <>
      {error && <p role="alert" className="rounded-lg bg-[var(--gh-fff0f0)] px-3 py-2 text-xs text-[var(--gh-cf222e)]">{error}</p>}
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Dialog.Close asChild>
          <button type="button" disabled={busy} className="rounded-lg px-4 py-2.5 text-[13px] font-semibold text-[var(--gh-0d1117)] ring-1 ring-inset ring-[var(--gh-e1e4e8)] disabled:opacity-50">Cancel</button>
        </Dialog.Close>
        <button type="submit" disabled={busy || disabled} className={`rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50 ${danger ? "bg-[var(--gh-cf222e)]" : "bg-[var(--gh-0d1117)] hover:bg-[var(--gh-24292f)]"}`}>
          {busy ? "Saving…" : confirm}
        </button>
      </div>
    </>
  );
}

/** Accept (agree the price), decline (with a reason) or complete (mark sold) a sale. */
function ActionDialog({ action, sale, onClose, onSave }: {
  action: ActionKind | null; sale: Sale | null; onClose: () => void;
  onSave: (body: Record<string, unknown>) => Promise<string | null>;
}) {
  const [price, setPrice] = useState("");
  const [reason, setReason] = useState("");
  const [plate, setPlate] = useState("");
  const [paid, setPaid] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [openedFor, setOpenedFor] = useState<string | null>(null);

  const key = action && sale ? `${action}:${sale._id}` : null;
  if (key !== openedFor) {
    setOpenedFor(key);
    setPrice(sale ? String(salePrice(sale)) : "");
    setReason("");
    setPlate(sale?.plateNumber ?? "");
    setPaid(sale?.amountPaid ? String(sale.amountPaid) : "");
    setError("");
  }
  if (!action || !sale) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const body: Record<string, unknown> = { action };
    if (action === "accept") body.agreedPrice = price;
    if (action === "decline") body.reason = reason;
    if (action === "complete") Object.assign(body, { agreedPrice: price, plateNumber: plate || undefined, amountPaid: paid === "" ? undefined : paid });
    const err = await onSave(body);
    setBusy(false);
    if (err) setError(err);
  }

  const meta = {
    accept: { icon: Handshake, title: "Accept purchase request", desc: <>Agree the price with {sale.buyer.name}. They&apos;ll get a message that you accepted.</>, confirm: "Accept request" },
    decline: { icon: X, title: "Decline purchase request", desc: <>{sale.buyer.name} will be told their request for {sale.vehicle.title} was declined.</>, confirm: "Decline request" },
    complete: { icon: BadgeDollarSign, title: "Mark as sold", desc: <>Record the sale of {sale.vehicle.title} to {sale.buyer.name}. The listing is tagged Sold and other requests for it are declined.</>, confirm: "Mark as sold" },
  }[action];

  return (
    <DialogShell open onOpenChange={o => !o && onClose()} busy={busy} icon={meta.icon} title={meta.title} description={meta.desc}>
      <form onSubmit={submit} className="mt-5 space-y-3.5">
        {(action === "accept" || action === "complete") && (
          <div>
            <label htmlFor="sale-price" className={label}>{action === "accept" ? "Agreed price (PKR)" : "Final sale price (PKR)"}</label>
            <input id="sale-price" type="number" min={1} inputMode="numeric" value={price} onChange={e => setPrice(e.target.value)} className={field} />
            <p className="mt-1 text-[11px] text-[var(--gh-8c959f)]">
              Asking {pkr(sale.askingPrice)}{sale.offerPrice !== undefined ? ` · buyer offered ${pkr(sale.offerPrice)}` : ""}
            </p>
          </div>
        )}
        {action === "complete" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sale-plate" className={label}>Number plate</label>
              <input id="sale-plate" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} placeholder="LEA-1234" className={`${field} font-mono uppercase`} />
            </div>
            <div>
              <label htmlFor="sale-paid" className={label}>Paid so far (PKR)</label>
              <input id="sale-paid" type="number" min={0} inputMode="numeric" value={paid} onChange={e => setPaid(e.target.value)} placeholder="0" className={field} />
            </div>
          </div>
        )}
        {action === "decline" && (
          <div>
            <label htmlFor="sale-reason" className={label}>Reason (optional, shown to the buyer)</label>
            <input id="sale-reason" value={reason} onChange={e => setReason(e.target.value)} maxLength={300} placeholder="e.g. The offer is too low" className={field} />
          </div>
        )}
        <Footer busy={busy} error={error} confirm={meta.confirm} danger={action === "decline"} />
      </form>
    </DialogShell>
  );
}

/** Records a walk-in sale: one of the business's vehicles (or one it never listed) sold to a customer at the shop. */
function NewSaleDialog({ open, onOpenChange, vehicles, onCreated }: {
  open: boolean; onOpenChange: (o: boolean) => void; vehicles: Vehicle[]; onCreated: (id: string) => void;
}) {
  const empty = { vehicle: "", offTitle: "", price: "", name: "", phone: "", email: "", cnic: "", paid: "", plate: "", sold: "yes", notes: "" };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof empty, v: string) => setF(p => ({ ...p, [k]: v }));

  function pickVehicle(v: string) {
    const found = vehicles.find(x => x.value === v);
    setF(p => ({ ...p, vehicle: v, price: found ? String(found.price) : p.price }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.vehicle) { setError("Choose the vehicle"); return; }
    setBusy(true);
    setError("");
    const res = await fetch("/api/business/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicle: f.vehicle,
        offList: f.vehicle === "other" ? { title: f.offTitle } : undefined,
        price: f.price,
        buyer: { name: f.name, phone: f.phone, email: f.email, cnic: f.cnic },
        amountPaid: f.paid,
        plateNumber: f.plate || undefined,
        sold: f.sold === "yes",
        notes: f.notes,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(d.error || "Couldn't record the sale"); return; }
    setF(empty);
    onCreated(d.sale._id);
  }

  return (
    <DialogShell open={open} onOpenChange={o => { if (!o) { setF(empty); setError(""); } onOpenChange(o); }} busy={busy} icon={Plus}
      title="New sale" description="Record a vehicle sold to a customer at your shop. It's added to your sales records and customers.">
      <form onSubmit={submit} className="mt-5 space-y-3">
        <div>
          <label className={label}>Vehicle</label>
          <Select value={f.vehicle} onChange={pickVehicle} placeholder="Choose a vehicle" ariaLabel="Vehicle" size="md"
            options={[...vehicles.map(v => ({ value: v.value, label: `${v.title} · ${pkr(v.price)}` })), { value: "other", label: "Other vehicle (not listed on AutoGO)" }]} />
        </div>
        {f.vehicle === "other" && (
          <input value={f.offTitle} onChange={e => set("offTitle", e.target.value)} placeholder="e.g. Honda Civic 2021 white" className={field} aria-label="Vehicle description" />
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ns-price" className={label}>Sale price (PKR)</label>
            <input id="ns-price" type="number" min={1} inputMode="numeric" value={f.price} onChange={e => set("price", e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="ns-paid" className={label}>Paid so far (PKR)</label>
            <input id="ns-paid" type="number" min={0} inputMode="numeric" value={f.paid} onChange={e => set("paid", e.target.value)} placeholder="0" className={field} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ns-name" className={label}>Buyer name</label>
            <input id="ns-name" value={f.name} onChange={e => set("name", e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="ns-phone" className={label}>Buyer phone</label>
            <input id="ns-phone" type="tel" value={f.phone} onChange={e => set("phone", e.target.value)} placeholder="0300 1234567" className={field} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ns-cnic" className={label}>CNIC (optional)</label>
            <input id="ns-cnic" inputMode="numeric" value={f.cnic} onChange={e => set("cnic", formatCnicInput(e.target.value))} placeholder="35202-1234567-1" className={`${field} font-mono`} />
          </div>
          <div>
            <label htmlFor="ns-plate" className={label}>Number plate (optional)</label>
            <input id="ns-plate" value={f.plate} onChange={e => set("plate", e.target.value.toUpperCase())} placeholder="LEA-1234" className={`${field} font-mono uppercase`} />
          </div>
        </div>
        <div>
          <label className={label}>Status</label>
          <div role="radiogroup" className="grid grid-cols-2 gap-1 rounded-lg bg-[var(--gh-f6f8fa)] p-1 ring-1 ring-inset ring-[var(--gh-e1e4e8)]">
            {([["yes", "Sold & handed over"], ["no", "Agreed, not handed over"]] as const).map(([v, t]) => (
              <button key={v} type="button" role="radio" aria-checked={f.sold === v} onClick={() => set("sold", v)}
                className={`rounded-md px-2 py-2 text-xs font-semibold ${f.sold === v ? "bg-[var(--gh-0d1117)] text-white" : "text-[var(--gh-57606a)]"}`}>{t}</button>
            ))}
          </div>
        </div>
        <input value={f.notes} onChange={e => set("notes", e.target.value)} maxLength={1000} placeholder="Notes (optional, only your team sees them)" className={field} aria-label="Notes" />
        <Footer busy={busy} error={error} confirm="Save sale" />
      </form>
    </DialogShell>
  );
}

/** CSV of the sales records, for the business's own books. */
function exportCsv(sales: Sale[]) {
  const head = ["Sale no", "Date", "Status", "Source", "Vehicle", "Plate", "Buyer", "Phone", "CNIC", "Asking", "Offer", "Sale price", "Paid", "Balance", "Sold on"];
  const rows = sales.map(s => {
    const pay = purchasePayment(s);
    return [purchaseNumber(s._id), fmt(s.createdAt), PURCHASE_LABEL[s.status], s.source === "WALK_IN" ? "Walk-in" : "Online", s.vehicle.title, s.plateNumber ?? "",
      s.buyer.name, s.buyer.phone, s.buyer.cnic ?? "", s.askingPrice, s.offerPrice ?? "", salePrice(s), pay.paid, s.status === "COMPLETED" ? pay.balance : "", s.completedAt ? fmt(s.completedAt) : ""];
  });
  const csv = [head, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `sales-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Business console: purchase requests from buyers, walk-in sales, and the full sales record. */
export default function BusinessSalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [canManageMoney, setCanManageMoney] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<"" | PurchaseStatus>("");
  const [search, setSearch] = useState("");
  // Links from the dashboard's Today list open with ?q=<booking or sale number> already searched
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) queueMicrotask(() => setSearch(q));
  }, []);
  const [openMore, setOpenMore] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  useQuickNew("sale", () => setNewOpen(true));
  const [created, setCreated] = useState<string | null>(null);
  const [actionFor, setActionFor] = useState<{ kind: ActionKind; sale: Sale } | null>(null);
  const [payFor, setPayFor] = useState<Sale | null>(null);
  const [planFor, setPlanFor] = useState<Sale | null>(null);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [removeFor, setRemoveFor] = useState<Sale | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");
  const scheduleSale = scheduleId ? sales.find(x => x._id === scheduleId) ?? null : null;

  function load() {
    return fetch("/api/business/sales")
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Couldn't load sales");
        setSales(d.sales);
        setStats(d.stats);
        setVehicles(d.vehicles);
        setCanManage(d.canManage);
        setCanManageMoney(d.canManageMoney);
        setLoadError("");
      })
      .catch(e => setLoadError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function patch(id: string, body: Record<string, unknown>): Promise<string | null> {
    const res = await fetch(`/api/business/sales/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return d.error || "Couldn't update the sale";
    await load();
    refreshNotificationCounts();
    return null;
  }

  async function remove() {
    if (!removeFor) return;
    setRemoving(true);
    setRemoveError("");
    const res = await fetch(`/api/business/sales/${removeFor._id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    setRemoving(false);
    if (!res.ok) { setRemoveError(d.error || "Couldn't remove the sale"); return; }
    setRemoveFor(null);
    setOpenMore(null);
    load();
  }

  /** Finished records can go; a sold one only for the owner or a manager, once it's fully paid. */
  const canRemove = (s: Sale) => canManage && REMOVABLE_PURCHASE_STATUSES.includes(s.status)
    && (s.status !== "COMPLETED" || (canManageMoney && purchasePayment(s).balance <= 0));

  const q = search.trim().toLowerCase();
  const shown = useMemo(() => sales.filter(s => {
    if (filter && s.status !== filter) return false;
    if (!q) return true;
    return [purchaseNumber(s._id), s.buyer.name, s.buyer.phone, s.vehicle.title, s.plateNumber ?? ""].some(v => v.toLowerCase().includes(q));
  }), [sales, filter, q]);

  const iconBtn = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-2.5 text-xs font-semibold transition hover:bg-[var(--gh-f6f8fa)] disabled:opacity-50";
  const trayBtn = "inline-flex items-center gap-1.5 rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--gh-0d1117)] transition hover:bg-[var(--gh-f6f8fa)]";

  return (
    <div className="min-h-screen bg-[var(--gh-f6f8fa)]">
      <ConfirmDialog
        open={removeFor !== null}
        onOpenChange={o => !o && setRemoveFor(null)}
        title="Remove this sale record?"
        description={removeFor?.status === "COMPLETED"
          ? <><strong>{removeFor.vehicle.title}</strong> ({purchaseNumber(removeFor._id)}) leaves your Sales list and its totals. Its payments stay in the cash book and profit per vehicle.</>
          : <><strong>{removeFor?.vehicle.title}</strong> ({removeFor ? purchaseNumber(removeFor._id) : ""}) leaves your Sales list.{removeFor?.source === "ONLINE" ? " The buyer keeps their own copy." : ""}</>}
        confirmLabel="Remove"
        loadingLabel="Removing..."
        loading={removing}
        error={removeError}
        onConfirm={remove}
      />
      <NewSaleDialog open={newOpen} onOpenChange={setNewOpen} vehicles={vehicles} onCreated={id => { setNewOpen(false); setCreated(id); load(); }} />
      <ActionDialog action={actionFor?.kind ?? null} sale={actionFor?.sale ?? null} onClose={() => setActionFor(null)}
        onSave={async body => { const err = await patch(actionFor!.sale._id, body); if (!err) setActionFor(null); return err; }} />
      <PaymentDialog open={payFor !== null} onOpenChange={o => !o && setPayFor(null)} booking={payFor ? asPayable(payFor) : null} customer={payFor?.buyer.name}
        onSave={async (body: { status: PaymentStatus; amountPaid?: number }) => { const err = await patch(payFor!._id, { action: "payment", ...body }); if (!err) setPayFor(null); return err; }} />
      <InstallmentSetupDialog open={planFor !== null} onOpenChange={o => !o && setPlanFor(null)} price={planFor ? salePrice(planFor) : 0} paid={planFor?.amountPaid ?? 0} buyer={planFor?.buyer.name ?? ""}
        onSave={async body => { const id = planFor!._id; const err = await patch(id, { action: "installments", ...body }); if (!err) { setPlanFor(null); setScheduleId(id); } return err; }} />
      <InstallmentScheduleDialog open={scheduleSale !== null} onOpenChange={o => !o && setScheduleId(null)} saleId={scheduleSale?._id ?? ""} plan={scheduleSale?.installmentPlan ?? null}
        buyer={scheduleSale?.buyer.name ?? ""} canManage={canManage}
        onAction={async body => { const err = await patch(scheduleSale!._id, body); if (!err && body.action === "removeInstallments") setScheduleId(null); return err; }} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--gh-e1e4e8)] bg-white px-4 py-5 sm:px-6">
        <div className="min-w-0">
          <Link href="/business/dashboard" className="text-xs text-[var(--gh-57606a)] hover:text-[var(--gh-0d1117)]">← Dashboard</Link>
          <h1 className="mt-1 text-lg font-bold text-[var(--gh-0d1117)]">Sales</h1>
          <p className="mt-0.5 text-xs text-[var(--gh-57606a)]">Purchase requests from buyers, walk-in sales, sale slips and your sales records</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportCsv(shown)} disabled={sales.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-3.5 py-2.5 text-[13px] font-semibold text-[var(--gh-0d1117)] transition hover:bg-[var(--gh-f6f8fa)] disabled:opacity-50">
            <Download size={14} /> Export CSV
          </button>
          {canManage && (
            <button onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--gh-0d1117)] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[var(--gh-24292f)]">
              <Plus size={15} strokeWidth={2.2} /> New sale
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6">
        {created && (
          <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--gh-56d364)] bg-[var(--gh-dafbe1)] px-4 py-3 text-[13px] text-[var(--gh-1a7f37)]">
            <span className="flex items-center gap-2"><CheckCircle2 size={16} /> Sale {purchaseNumber(created)} recorded.</span>
            <span className="flex gap-2">
              <Link href={`/business/sales/${created}/slip`} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--gh-1a7f37)] px-3 py-1.5 text-xs font-semibold text-white"><FileText size={13} /> Print slip</Link>
              <button onClick={() => setCreated(null)} aria-label="Dismiss" className="rounded-lg px-2 hover:bg-white/50"><X size={14} /></button>
            </span>
          </div>
        )}

        {stats && (
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "New requests", value: String(stats.requests), icon: Clock3, color: "var(--gh-7d4e00)" },
              { label: "Accepted, not sold yet", value: String(stats.accepted), icon: Handshake, color: "var(--gh-0550ae)" },
              { label: "Sold this month", value: `PKR ${formatLakh(stats.revenueThisMonth)}`, hint: `${stats.soldThisMonth} vehicle${stats.soldThisMonth !== 1 ? "s" : ""} · PKR ${formatLakh(stats.revenueTotal)} all time`, icon: BadgeDollarSign, color: "var(--gh-1a7f37)" },
              { label: "Balance still due", value: `PKR ${formatLakh(stats.outstanding)}`, icon: Wallet, color: stats.outstanding ? "var(--gh-cf222e)" : "var(--gh-0d1117)" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-[var(--gh-e1e4e8)] bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-[var(--gh-8c959f)]">{s.label}</p>
                  <s.icon size={16} className="flex-shrink-0" style={{ color: s.color }} />
                </div>
                <p className="mt-2 text-lg font-extrabold leading-tight tabular-nums sm:text-xl" style={{ color: s.color }}>{s.value}</p>
                {s.hint && <p className="mt-0.5 truncate text-[11px] text-[var(--gh-8c959f)]">{s.hint}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {(["", ...PURCHASE_STATUSES] as const).map(s => {
              const active = filter === s;
              const count = s ? sales.filter(x => x.status === s).length : sales.length;
              return (
                <button key={s || "all"} onClick={() => setFilter(s)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? "bg-[var(--gh-0d1117)] text-white" : "bg-white text-[var(--gh-57606a)] ring-1 ring-inset ring-[var(--gh-e1e4e8)] hover:text-[var(--gh-0d1117)]"}`}>
                  {s ? PURCHASE_LABEL[s] : "All"} <span className={active ? "text-white/70" : "text-[var(--gh-8c959f)]"}>({count})</span>
                </button>
              );
            })}
          </div>
          <label className="relative block lg:w-[300px]">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gh-8c959f)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Sale no, buyer, phone, vehicle, plate…" className={`${field} pl-9`} aria-label="Search sales" />
          </label>
        </div>

        <div className="grid items-start gap-3 xl:grid-cols-2">
          {loading ? (
            [1, 2].map(i => <div key={i} className="h-[180px] animate-pulse rounded-2xl bg-white" />)
          ) : loadError ? (
            <div className="rounded-2xl border border-[var(--gh-ffcdd2)] bg-[var(--gh-fff0f0)] p-6 text-center text-sm text-[var(--gh-cf222e)] xl:col-span-2">{loadError}</div>
          ) : shown.length === 0 ? (
            <div className="rounded-2xl border border-[var(--gh-e1e4e8)] bg-white px-6 py-14 text-center xl:col-span-2">
              <BadgeDollarSign size={30} strokeWidth={1.5} className="mx-auto mb-3 text-[var(--gh-8c959f)]" />
              <p className="text-sm font-semibold text-[var(--gh-0d1117)]">{sales.length === 0 ? "No sales yet" : "No sales match your filters"}</p>
              <p className="mt-1 text-[13px] text-[var(--gh-57606a)]">
                {sales.length === 0 ? "Buyers' purchase requests for your vehicles appear here. Record shop sales with New sale." : "Try another status, or clear the search."}
              </p>
              {sales.length === 0 ? (
                canManage && <button onClick={() => setNewOpen(true)} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--gh-0d1117)] px-4 py-2.5 text-[13px] font-semibold text-white"><Plus size={15} /> Record a sale</button>
              ) : (
                <button onClick={() => { setFilter(""); setSearch(""); }} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-4 py-2.5 text-[13px] font-semibold text-[var(--gh-0d1117)]">Clear filters</button>
              )}
            </div>
          ) : shown.map(s => {
            const st = PURCHASE_STYLE[s.status];
            const open = OPEN_PURCHASE_STATUSES.includes(s.status);
            const moreOpen = openMore === s._id;
            const closedNoSale = s.status === "DECLINED" || s.status === "CANCELLED";
            const primary = !canManage ? null
              : s.status === "REQUESTED" ? { label: "Accept", icon: Handshake, kind: "accept" as const, cls: "bg-[var(--gh-2da44e)] hover:bg-[var(--gh-2c974b)]" }
              : s.status === "ACCEPTED" ? { label: "Mark as sold", icon: BadgeDollarSign, kind: "complete" as const, cls: "bg-[var(--gh-0d1117)] hover:bg-[var(--gh-24292f)]" }
              : null;
            const itemHref = s.listingId ? `/listings/${s.listingId}` : s.dealId ? `/deals/${s.dealId}` : null;
            return (
              <div key={s._id} className={`overflow-hidden rounded-2xl border bg-white ${s.status === "REQUESTED" ? "border-[var(--gh-e3b341)]" : "border-[var(--gh-e1e4e8)]"}`}>
                <div className="p-3.5 sm:p-4">
                  <div className="flex gap-3">
                    <div className="relative h-14 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-[var(--gh-f6f8fa)] sm:h-16 sm:w-20">
                      {s.vehicle.image
                        ? <Image src={s.vehicle.image} alt="" fill sizes="80px" className="object-cover" />
                        : <div className="flex h-full items-center justify-center text-[var(--gh-8c959f)]"><Car size={18} strokeWidth={1.5} /></div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        {itemHref
                          ? <Link href={itemHref} target="_blank" className="min-w-0 truncate text-[15px] font-bold leading-tight text-[var(--gh-0d1117)] hover:underline">{s.vehicle.title}</Link>
                          : <p className="min-w-0 truncate text-[15px] font-bold leading-tight text-[var(--gh-0d1117)]">{s.vehicle.title}</p>}
                        <StatusText color={st.color}>{PURCHASE_LABEL[s.status]}</StatusText>
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-[var(--gh-57606a)]">
                        <span className="font-mono font-bold">{purchaseNumber(s._id)}</span>
                        <span aria-hidden>·</span>
                        {s.source === "WALK_IN" ? <span className="inline-flex items-center gap-0.5 font-semibold text-[var(--gh-8250df)]"><Store size={10} /> Walk-in <Tip id="walkIn" size={11} /></span> : <span>Online request</span>}
                        <span aria-hidden>·</span>
                        <span>{fmt(s.createdAt)}</span>
                      </p>
                      <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-[var(--gh-57606a)]">
                        <UserRound size={12} className="flex-shrink-0 text-[var(--gh-8c959f)]" />
                        <span className="truncate">{s.buyer.name}</span>
                        <a href={`tel:${s.buyer.phone}`} className="flex flex-shrink-0 items-center gap-1 font-semibold text-[var(--gh-0d1117)]"><Phone size={11} /> {s.buyer.phone}</a>
                      </p>
                    </div>
                  </div>

                  {s.message && <p className="mt-2.5 line-clamp-2 text-xs italic text-[var(--gh-57606a)]">“{s.message}”</p>}
                  {s.declineReason && <p className="mt-2 text-xs text-[var(--gh-cf222e)]">Declined: {s.declineReason}</p>}

                  <div className="mt-3">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <p className="whitespace-nowrap text-base font-extrabold leading-tight tabular-nums text-[var(--gh-0d1117)]">{pkr(salePrice(s))}</p>
                      {!closedNoSale && s.status !== "REQUESTED" && <PaymentTag booking={asPayable(s)} onClick={canManage ? () => setPayFor(s) : undefined} />}
                    </div>
                    <p className="mt-0.5 text-[11px] text-[var(--gh-8c959f)]">
                      {s.agreedPrice !== undefined ? "Agreed" : s.offerPrice !== undefined ? "Buyer's offer" : "Asking price"}
                      {(s.agreedPrice !== undefined || s.offerPrice !== undefined) && ` · asking ${pkr(s.askingPrice)}`}
                      {s.agreedPrice !== undefined && s.offerPrice !== undefined && ` · offered ${pkr(s.offerPrice)}`}
                      {s.plateNumber && ` · ${s.plateNumber}`}
                    </p>
                    {s.installmentPlan && <div className="mt-1"><InstallmentLine plan={s.installmentPlan} onClick={() => setScheduleId(s._id)} /></div>}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 border-t border-[var(--gh-e1e4e8)] px-3.5 py-2.5 sm:px-4">
                  {primary && (
                    <button onClick={() => setActionFor({ kind: primary.kind, sale: s })} className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold text-white transition sm:flex-none ${primary.cls}`}>
                      <primary.icon size={14} /> {primary.label}
                    </button>
                  )}
                  <div className={`flex items-center gap-1.5 ${primary ? "" : "flex-1"}`}>
                    {s.status !== "CANCELLED" && (
                      <Link href={`/business/sales/${s._id}/slip`} aria-label="Sale slip" className={`${iconBtn} text-[var(--gh-0d1117)]`}>
                        <FileText size={14} /> <span className={primary ? "hidden sm:inline" : ""}>Slip</span>
                      </Link>
                    )}
                    <a href={`https://wa.me/${s.buyer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${s.buyer.name}, regarding ${s.vehicle.title} (${purchaseNumber(s._id)})`)}`}
                      target="_blank" rel="noreferrer" aria-label="WhatsApp the buyer" className={`${iconBtn} text-[var(--gh-1a7f37)]`}>
                      <MessageCircle size={14} /> <span className={primary ? "hidden sm:inline" : ""}>WhatsApp</span>
                    </a>
                  </div>
                  <button type="button" onClick={() => setOpenMore(moreOpen ? null : s._id)} aria-expanded={moreOpen} aria-label="More actions"
                    className={`${iconBtn} ml-auto ${moreOpen ? "bg-[var(--gh-f6f8fa)] text-[var(--gh-0d1117)]" : "text-[var(--gh-57606a)]"}`}>
                    <MoreHorizontal size={15} /> <span className="hidden sm:inline">More</span>
                  </button>
                </div>

                {moreOpen && (
                  <div className="space-y-3 border-t border-[var(--gh-e1e4e8)] bg-[var(--gh-fafbfc)] px-3.5 py-3 sm:px-4">
                    {canManage && (
                      <div className="flex flex-wrap gap-1.5">
                        {s.status === "REQUESTED" && (
                          <button onClick={() => setActionFor({ kind: "complete", sale: s })} className={trayBtn}><BadgeDollarSign size={13} /> Mark as sold now</button>
                        )}
                        {!closedNoSale && (
                          <button onClick={() => setPayFor(s)} className={trayBtn}><Wallet size={13} /> Update payment</button>
                        )}
                        {(s.status === "ACCEPTED" || s.status === "COMPLETED") && (
                          s.installmentPlan
                            ? <button onClick={() => setScheduleId(s._id)} className={trayBtn}><CalendarClock size={13} /> Installments</button>
                            : purchasePayment(s).balance > 0 && <button onClick={() => setPlanFor(s)} className={trayBtn}><CalendarClock size={13} /> Set up installments</button>
                        )}
                        {open && (
                          <button onClick={() => setActionFor({ kind: "decline", sale: s })} className={`${trayBtn} border-[var(--gh-ffcdd2)] !text-[var(--gh-cf222e)] hover:bg-[var(--gh-fff0f0)]`}>
                            <X size={13} /> Decline
                          </button>
                        )}
                        {canRemove(s) && (
                          <button onClick={() => { setRemoveError(""); setRemoveFor(s); }} className={`${trayBtn} border-[var(--gh-ffcdd2)] !text-[var(--gh-cf222e)] hover:bg-[var(--gh-fff0f0)]`}>
                            <Trash2 size={13} /> Remove
                          </button>
                        )}
                      </div>
                    )}
                    <p className="text-[11px] leading-relaxed text-[var(--gh-8c959f)]">
                      {s.buyer.email && <>{s.buyer.email} · </>}
                      {s.buyer.cnic && <>CNIC {s.buyer.cnic} · </>}
                      Requested {fmt(s.createdAt)}
                      {s.acceptedAt && <> · accepted {fmt(s.acceptedAt)}</>}
                      {s.completedAt && <> · sold {fmt(s.completedAt)}</>}
                      {s.createdBy?.name && <> · recorded by {s.createdBy.name}</>}
                      {s.handledBy?.name && <> · last handled by {s.handledBy.name}</>}
                    </p>
                    {s.notes && <p className="text-[11px] text-[var(--gh-57606a)]"><span className="font-semibold">Notes:</span> {s.notes}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
