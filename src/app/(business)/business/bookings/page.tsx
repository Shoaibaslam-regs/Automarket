"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertTriangle, CalendarCheck, CalendarDays, Car, CheckCircle2, Clock3, FileText, KeyRound, Phone, Plus, Search,
  Store, Trash2, Undo2, UserRound, X,
} from "lucide-react";
import Select from "@/components/ui/Select";
import ConfirmDialog from "@/components/business/ConfirmDialog";
import { refreshNotificationCounts } from "@/hooks/useNotificationCounts";
import { BOOKING_STATUSES, bookingNumber, rentalDays, type BookingStatus } from "@/lib/bookings";

type Booking = {
  _id: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  deposit: number;
  status: BookingStatus;
  source?: "ONLINE" | "WALK_IN";
  walkIn?: { name: string; phone: string; email?: string; cnic?: string };
  notes?: string;
  createdAt: string;
  renterId?: { name?: string; email: string; phone?: string } | null;
  createdBy?: { name?: string } | null;
  rentalId?: { dailyRate: number; listingId?: { title: string; make: string; model: string; images: string[] } | null } | null;
};

type Vehicle = { rentalId: string; title: string; image: string | null; dailyRate: number; deposit: number };
type CustomerOption = { _id: string; name: string; phone: string; email?: string };

const STATUS_STYLE: Record<BookingStatus, { bg: string; color: string; label: string }> = {
  PENDING: { bg: "#fff8c5", color: "#7d4e00", label: "Pending" },
  CONFIRMED: { bg: "#ddf4ff", color: "#0550ae", label: "Confirmed" },
  ACTIVE: { bg: "#dafbe1", color: "#1a7f37", label: "Out now" },
  COMPLETED: { bg: "#f6f8fa", color: "#57606a", label: "Completed" },
  CANCELLED: { bg: "#fff0f0", color: "#cf222e", label: "Cancelled" },
};

const fmt = (d: string) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
const pkr = (n: number) => `PKR ${n.toLocaleString()}`;
const toInputDate = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

function customerOf(b: Booking) {
  if (b.source === "WALK_IN" && b.walkIn) return { name: b.walkIn.name, phone: b.walkIn.phone, email: b.walkIn.email };
  return { name: b.renterId?.name || "Customer", phone: b.renterId?.phone, email: b.renterId?.email };
}

const EMPTY_FORM = { rentalId: "", customerId: "", name: "", phone: "", email: "", cnic: "", startDate: "", endDate: "", notes: "", status: "CONFIRMED" };

/** Walk-in booking form: pick a vehicle and dates, then a CRM customer or new details. Shows the live price. */
function NewBookingDialog({ open, onOpenChange, vehicles, onCreated }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vehicles: Vehicle[];
  onCreated: (id: string) => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    fetch("/api/business/customers")
      .then(r => r.json())
      .then(d => setCustomers(d.customers || []))
      .catch(() => setCustomers([]));
  }, [open]);

  const vehicle = vehicles.find(v => v.rentalId === form.rentalId);
  const validDates = form.startDate && form.endDate && form.endDate > form.startDate;
  const days = validDates ? rentalDays(form.startDate, form.endDate) : 0;
  const rent = vehicle ? days * vehicle.dailyRate : 0;
  const set = (k: keyof typeof EMPTY_FORM, v: string) => setForm(p => ({ ...p, [k]: v }));

  function pickCustomer(id: string) {
    const c = customers.find(x => x._id === id);
    setForm(p => ({ ...p, customerId: id, name: c?.name ?? "", phone: c?.phone ?? "", email: c?.email ?? "" }));
  }

  function close(o: boolean) {
    if (saving) return;
    if (!o) { setForm(EMPTY_FORM); setError(""); }
    onOpenChange(o);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/business/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rentalId: form.rentalId,
        startDate: form.startDate,
        endDate: form.endDate,
        customerId: form.customerId || undefined,
        customer: { name: form.name, phone: form.phone, email: form.email, cnic: form.cnic },
        notes: form.notes,
        status: form.status,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setError(data.error || "Failed to create booking"); return; }
    setForm(EMPTY_FORM);
    onCreated(data.booking._id);
  }

  const input = "h-10 w-full rounded-lg border border-[#d0d7de] bg-white px-3 text-[13px] text-[#0d1117] outline-none transition focus:border-[#0d1117] focus:ring-2 focus:ring-[#0d1117]/10";
  const label = "mb-1.5 block text-xs font-semibold text-[#0d1117]";
  const today = toInputDate(new Date());

  return (
    <Dialog.Root open={open} onOpenChange={close}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] flex max-h-[calc(100vh-32px)] w-[calc(100%-32px)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl focus:outline-none">
          <div className="flex items-center justify-between border-b border-[#e1e4e8] px-5 py-4">
            <Dialog.Title className="flex items-center gap-2.5 text-[15px] font-bold text-[#0d1117]">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0d1117] text-white"><CalendarCheck size={15} /></span>
              New walk-in booking
            </Dialog.Title>
            <Dialog.Close aria-label="Close" disabled={saving} className="rounded-full p-1 text-[#8c959f] hover:bg-[#f6f8fa] hover:text-[#0d1117]"><X size={18} /></Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Book one of your rental vehicles for a customer who came in person or called.</Dialog.Description>

          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="space-y-4 overflow-y-auto px-5 py-5">
              <div>
                <label className={label}>Vehicle *</label>
                <Select
                  value={form.rentalId}
                  onChange={v => set("rentalId", v)}
                  ariaLabel="Vehicle"
                  placeholder="Choose a rental vehicle"
                  options={vehicles.map(v => ({ value: v.rentalId, label: `${v.title} · ${pkr(v.dailyRate)}/day` }))}
                  className="h-10 rounded-lg border-[#d0d7de] text-[13px] font-normal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label} htmlFor="bk-start">Start date *</label>
                  <input id="bk-start" type="date" required min={today} value={form.startDate} onChange={e => set("startDate", e.target.value)} className={input} />
                </div>
                <div>
                  <label className={label} htmlFor="bk-end">Return date *</label>
                  <input id="bk-end" type="date" required min={form.startDate || today} value={form.endDate} onChange={e => set("endDate", e.target.value)} className={input} />
                </div>
              </div>

              <div className="rounded-xl bg-[#f6f8fa] p-4 ring-1 ring-inset ring-[#e1e4e8]">
                <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#57606a]"><UserRound size={13} /> Customer</p>
                {customers.length > 0 && (
                  <div className="mb-3">
                    <Select
                      value={form.customerId}
                      onChange={pickCustomer}
                      ariaLabel="Existing customer"
                      placeholder="Pick from your customers (optional)"
                      options={customers.map(c => ({ value: c._id, label: `${c.name} · ${c.phone}` }))}
                      className="h-10 rounded-lg border-[#d0d7de] bg-white text-[13px] font-normal"
                    />
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={label} htmlFor="bk-name">Full name *</label>
                    <input id="bk-name" required value={form.name} onChange={e => set("name", e.target.value)} placeholder="Customer name" className={input} />
                  </div>
                  <div>
                    <label className={label} htmlFor="bk-phone">Phone *</label>
                    <input id="bk-phone" type="tel" required value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+92 300 0000000" className={input} />
                  </div>
                  <div>
                    <label className={label} htmlFor="bk-email">Email</label>
                    <input id="bk-email" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="Optional" className={input} />
                  </div>
                  <div>
                    <label className={label} htmlFor="bk-cnic">CNIC</label>
                    <input id="bk-cnic" value={form.cnic} onChange={e => set("cnic", e.target.value)} placeholder="35202-1234567-1" className={input} />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                <div>
                  <label className={label} htmlFor="bk-notes">Notes</label>
                  <input id="bk-notes" value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Pickup time, fuel level, driver…" className={input} />
                </div>
                <div>
                  <label className={label}>Status</label>
                  <Select
                    value={form.status}
                    onChange={v => set("status", v)}
                    ariaLabel="Status"
                    options={[{ value: "CONFIRMED", label: "Confirmed" }, { value: "PENDING", label: "Pending" }]}
                    className="h-10 rounded-lg border-[#d0d7de] text-[13px] font-normal"
                  />
                </div>
              </div>

              {vehicle && validDates && (
                <div className="rounded-xl bg-[#0d1117] p-4 text-white">
                  <div className="flex justify-between text-[13px] text-white/70"><span>{days} day{days !== 1 ? "s" : ""} × {pkr(vehicle.dailyRate)}</span><span>{pkr(rent)}</span></div>
                  <div className="mt-1 flex justify-between text-[13px] text-white/70"><span>Security deposit (refundable)</span><span>{pkr(vehicle.deposit)}</span></div>
                  <div className="mt-3 flex justify-between border-t border-white/15 pt-3 text-sm font-bold"><span>Due at pickup</span><span>{pkr(rent + vehicle.deposit)}</span></div>
                </div>
              )}

              {error && <div role="alert" className="rounded-lg border border-[#ffcdd2] bg-[#fff0f0] px-3 py-2.5 text-[13px] text-[#cf222e]">{error}</div>}
            </div>

            <div className="flex justify-end gap-2 border-t border-[#e1e4e8] px-5 py-4">
              <Dialog.Close asChild>
                <button type="button" disabled={saving} className="rounded-lg border border-[#e1e4e8] bg-[#f6f8fa] px-4 py-2 text-[13px] font-semibold text-[#0d1117]">Cancel</button>
              </Dialog.Close>
              <button type="submit" disabled={saving || !form.rentalId} className="rounded-lg bg-[#0d1117] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
                {saving ? "Creating…" : "Create booking"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function BusinessBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | BookingStatus>("");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Booking | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Booking | null>(null);
  const [removeError, setRemoveError] = useState("");
  // "Now" for overdue checks, captured when bookings load so rendering stays pure
  const [now, setNow] = useState(0);

  const fetchBookings = () =>
    fetch("/api/business/bookings")
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load bookings");
        setBookings(d.bookings || []);
        setVehicles(d.vehicles || []);
        setNow(Date.now());
        setCanManage(!!d.permissions?.canManage);
      })
      .catch(err => setLoadError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => { fetchBookings(); }, []);

  async function updateStatus(b: Booking, status: BookingStatus) {
    setUpdating(b._id);
    setActionError("");
    const res = await fetch(`/api/business/bookings/${b._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdating(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setActionError(d.error || "Failed to update booking");
    }
    setConfirmCancel(null);
    fetchBookings();
    // Accepting or declining a request changes the pending count on the sidebar badge
    refreshNotificationCounts();
  }

  async function removeBooking() {
    const b = confirmRemove;
    if (!b) return;
    setUpdating(b._id);
    setRemoveError("");
    const res = await fetch(`/api/business/bookings/${b._id}`, { method: "DELETE" });
    setUpdating(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setRemoveError(d.error || "Failed to remove booking");
      return;
    }
    setConfirmRemove(null);
    setBookings(prev => prev.filter(x => x._id !== b._id));
  }

  const stats = useMemo(() => {
    const revenue = bookings.filter(b => b.status === "COMPLETED").reduce((s, b) => s + b.totalAmount, 0);
    return {
      pending: bookings.filter(b => b.status === "PENDING").length,
      upcoming: bookings.filter(b => b.status === "CONFIRMED").length,
      out: bookings.filter(b => b.status === "ACTIVE").length,
      overdue: bookings.filter(b => b.status === "ACTIVE" && new Date(b.endDate).getTime() < now).length,
      revenue,
    };
  }, [bookings, now]);

  const q = search.trim().toLowerCase();
  const filtered = bookings.filter(b => {
    if (statusFilter && b.status !== statusFilter) return false;
    if (!q) return true;
    const c = customerOf(b);
    return [bookingNumber(b._id), c.name, c.phone ?? "", b.rentalId?.listingId?.title ?? ""].some(v => v.toLowerCase().includes(q));
  });

  const btn = "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";

  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      <NewBookingDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        vehicles={vehicles}
        onCreated={id => { setNewOpen(false); setCreated(id); fetchBookings(); }}
      />
      <ConfirmDialog
        open={confirmCancel !== null}
        onOpenChange={o => !o && setConfirmCancel(null)}
        title={`${confirmCancel?.status === "PENDING" ? "Decline" : "Cancel"} booking ${confirmCancel ? bookingNumber(confirmCancel._id) : ""}`}
        description={confirmCancel && (
          <>
            {customerOf(confirmCancel).name}&apos;s booking for <strong style={{ color: "#0d1117" }}>{confirmCancel.rentalId?.listingId?.title}</strong> ({fmt(confirmCancel.startDate)} → {fmt(confirmCancel.endDate)}) will be cancelled and the dates freed up.
            {confirmCancel.source !== "WALK_IN" && " The renter will be notified by email."}
          </>
        )}
        confirmLabel={confirmCancel?.status === "PENDING" ? "Decline booking" : "Cancel booking"}
        loadingLabel="Cancelling..."
        loading={confirmCancel !== null && updating === confirmCancel._id}
        onConfirm={() => confirmCancel && updateStatus(confirmCancel, "CANCELLED")}
      />

      <ConfirmDialog
        open={confirmRemove !== null}
        onOpenChange={o => { if (!o) { setConfirmRemove(null); setRemoveError(""); } }}
        title={`Remove booking ${confirmRemove ? bookingNumber(confirmRemove._id) : ""}`}
        description={confirmRemove && (
          <>
            This {confirmRemove.status === "COMPLETED" ? "completed" : "cancelled"} booking for <strong style={{ color: "#0d1117" }}>{customerOf(confirmRemove).name}</strong> will be
            removed from your bookings list.
            {confirmRemove.source === "WALK_IN"
              ? " Walk-in bookings are deleted permanently, so print the slip first if you need a copy."
              : " The renter keeps their own copy."}
          </>
        )}
        confirmLabel="Remove booking"
        loadingLabel="Removing..."
        loading={confirmRemove !== null && updating === confirmRemove._id}
        error={removeError}
        onConfirm={removeBooking}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e1e4e8] bg-white px-4 py-5 sm:px-6">
        <div className="min-w-0">
          <Link href="/business/dashboard" className="text-xs text-[#57606a] hover:text-[#0d1117]">← Dashboard</Link>
          <h1 className="mt-1 text-lg font-bold text-[#0d1117]">Bookings</h1>
          <p className="mt-0.5 text-xs text-[#57606a]">Rental requests, walk-in bookings, handovers and slips for your whole fleet</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/sell" className="inline-flex items-center gap-1.5 rounded-lg border border-[#e1e4e8] bg-white px-3.5 py-2.5 text-[13px] font-semibold text-[#0d1117] transition hover:bg-[#f6f8fa]">
            <KeyRound size={14} /> Add rental vehicle
          </Link>
          {canManage && (
            <button
              onClick={() => setNewOpen(true)}
              disabled={vehicles.length === 0}
              title={vehicles.length === 0 ? "List a vehicle for rent first" : undefined}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0d1117] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#24292f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={15} strokeWidth={2.2} /> New booking
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6">
        {created && (
          <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#56d364] bg-[#dafbe1] px-4 py-3 text-[13px] text-[#1a7f37]">
            <span className="flex items-center gap-2"><CheckCircle2 size={16} /> Booking {bookingNumber(created)} created.</span>
            <span className="flex gap-2">
              <Link href={`/business/bookings/${created}/slip`} target="_blank" className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a7f37] px-3 py-1.5 text-xs font-semibold text-white">
                <FileText size={13} /> Print slip
              </Link>
              <button onClick={() => setCreated(null)} aria-label="Dismiss" className="rounded-lg px-2 text-[#1a7f37] hover:bg-white/50"><X size={14} /></button>
            </span>
          </div>
        )}
        {actionError && <div role="alert" className="mb-4 rounded-xl border border-[#ffcdd2] bg-[#fff0f0] px-4 py-3 text-[13px] text-[#cf222e]">{actionError}</div>}

        {/* Stats */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Pending requests", value: stats.pending, icon: Clock3, color: "#7d4e00", bg: "#fff8c5" },
            { label: "Upcoming pickups", value: stats.upcoming, icon: CalendarDays, color: "#0550ae", bg: "#ddf4ff" },
            { label: "Out now", value: stats.out, icon: Car, color: "#1a7f37", bg: "#dafbe1", hint: stats.overdue ? `${stats.overdue} overdue` : undefined },
            { label: "Completed revenue", value: pkr(stats.revenue), icon: CheckCircle2, color: "#0d1117", bg: "#f6f8fa" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-[#e1e4e8] bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-[#8c959f]">{s.label}</p>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: s.bg, color: s.color }}><s.icon size={14} /></span>
              </div>
              <p className="mt-2 truncate text-xl font-extrabold tabular-nums" style={{ color: s.color }}>{s.value}</p>
              {s.hint && <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-[#cf222e]"><AlertTriangle size={11} /> {s.hint}</p>}
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {(["", ...BOOKING_STATUSES] as const).map(s => {
              const active = statusFilter === s;
              const count = s ? bookings.filter(b => b.status === s).length : bookings.length;
              return (
                <button
                  key={s || "ALL"}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs transition ${active ? "border-[#0d1117] bg-[#0d1117] font-semibold text-white" : "border-[#e1e4e8] bg-white text-[#57606a] hover:border-[#d0d7de]"}`}
                >
                  {s ? STATUS_STYLE[s].label : "All"} <span className={active ? "text-white/70" : "text-[#8c959f]"}>({count})</span>
                </button>
              );
            })}
          </div>
          <div className="relative lg:w-72">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8c959f]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Booking no, customer, phone, vehicle…"
              className="h-10 w-full rounded-xl border border-[#e1e4e8] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[#0d1117] focus:ring-2 focus:ring-[#0d1117]/10"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex flex-col gap-3">
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="h-[132px] animate-pulse rounded-2xl bg-white" />)
          ) : loadError ? (
            <div className="rounded-2xl border border-[#ffcdd2] bg-[#fff0f0] p-6 text-center text-sm text-[#cf222e]">{loadError}</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-[#e1e4e8] bg-white px-6 py-14 text-center">
              <div className="mb-3 flex justify-center text-[#8c959f]"><CalendarCheck size={30} strokeWidth={1.5} /></div>
              <p className="text-sm font-semibold text-[#0d1117]">{bookings.length === 0 ? "No bookings yet" : "No bookings match your filters"}</p>
              <p className="mt-1 text-[13px] text-[#57606a]">
                {vehicles.length === 0
                  ? "List a vehicle for rent to start taking bookings."
                  : bookings.length === 0 && canManage ? "Online requests appear here, or create a walk-in booking." : ""}
              </p>
            </div>
          ) : filtered.map(b => {
            const s = STATUS_STYLE[b.status] ?? STATUS_STYLE.PENDING;
            const listing = b.rentalId?.listingId;
            const c = customerOf(b);
            const days = rentalDays(b.startDate, b.endDate);
            const overdue = b.status === "ACTIVE" && new Date(b.endDate).getTime() < now;
            const busy = updating === b._id;
            return (
              <div key={b._id} className={`rounded-2xl border bg-white p-4 sm:p-5 ${overdue ? "border-[#ffcdd2]" : "border-[#e1e4e8]"}`}>
                <div className="flex flex-wrap items-start gap-4">
                  <div className="relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-[#f6f8fa]">
                    {listing?.images?.[0]
                      ? <Image src={listing.images[0]} alt="" fill sizes="80px" className="object-cover" />
                      : <div className="flex h-full items-center justify-center text-[#8c959f]"><Car size={18} strokeWidth={1.5} /></div>}
                  </div>

                  <div className="min-w-[200px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-[#57606a]">{bookingNumber(b._id)}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${b.source === "WALK_IN" ? "bg-[#fbefff] text-[#8250df]" : "bg-[#f6f8fa] text-[#57606a]"}`}>
                        {b.source === "WALK_IN" ? <><Store size={10} /> WALK-IN</> : "ONLINE"}
                      </span>
                      {overdue && <span className="inline-flex items-center gap-1 rounded-full bg-[#fff0f0] px-2 py-0.5 text-[10px] font-bold text-[#cf222e]"><AlertTriangle size={10} /> OVERDUE</span>}
                    </div>
                    <p className="mt-1 truncate text-sm font-bold text-[#0d1117]">{listing?.title || "Vehicle"}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#57606a]">
                      <span className="flex items-center gap-1"><CalendarDays size={12} /> {fmt(b.startDate)} → {fmt(b.endDate)} ({days}d)</span>
                      <span className="flex items-center gap-1"><UserRound size={12} /> {c.name}</span>
                      {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-1 font-semibold text-[#0d1117]"><Phone size={12} /> {c.phone}</a>}
                    </div>
                    {b.notes && <p className="mt-1.5 truncate text-xs italic text-[#8c959f]">“{b.notes}”</p>}
                    <div className="mt-3 flex flex-wrap gap-5">
                      <div><p className="text-[11px] text-[#8c959f]">Rental</p><p className="text-sm font-bold tabular-nums text-[#0d1117]">{pkr(b.totalAmount)}</p></div>
                      <div><p className="text-[11px] text-[#8c959f]">Deposit</p><p className="text-sm font-bold tabular-nums text-[#0d1117]">{pkr(b.deposit)}</p></div>
                      <div><p className="text-[11px] text-[#8c959f]">Total</p><p className="text-sm font-bold tabular-nums text-[#1a7f37]">{pkr(b.totalAmount + b.deposit)}</p></div>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                    <span className="self-start rounded-full px-2.5 py-1 text-[11px] font-bold sm:self-end" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                    <div className="flex flex-wrap gap-1.5 sm:justify-end">
                      {canManage && b.status === "PENDING" && (
                        <>
                          <button onClick={() => updateStatus(b, "CONFIRMED")} disabled={busy} className={`${btn} bg-[#2da44e] text-white hover:bg-[#2c974b]`}>
                            <CheckCircle2 size={13} /> Confirm
                          </button>
                          <button onClick={() => setConfirmCancel(b)} disabled={busy} className={`${btn} border border-[#ffcdd2] bg-white text-[#cf222e] hover:bg-[#fff0f0]`}>Decline</button>
                        </>
                      )}
                      {canManage && b.status === "CONFIRMED" && (
                        <>
                          <button onClick={() => updateStatus(b, "ACTIVE")} disabled={busy} className={`${btn} bg-[#0d1117] text-white hover:bg-[#24292f]`} title="The customer has collected the vehicle">
                            <KeyRound size={13} /> Hand over
                          </button>
                          <button onClick={() => setConfirmCancel(b)} disabled={busy} className={`${btn} border border-[#ffcdd2] bg-white text-[#cf222e] hover:bg-[#fff0f0]`}>Cancel</button>
                        </>
                      )}
                      {canManage && b.status === "ACTIVE" && (
                        <button onClick={() => updateStatus(b, "COMPLETED")} disabled={busy} className={`${btn} bg-[#0d1117] text-white hover:bg-[#24292f]`} title="The vehicle is back">
                          <Undo2 size={13} /> Mark returned
                        </button>
                      )}
                      {canManage && (b.status === "COMPLETED" || b.status === "CANCELLED") && (
                        <button onClick={() => { setRemoveError(""); setConfirmRemove(b); }} disabled={busy} className={`${btn} border border-[#e1e4e8] bg-white text-[#57606a] hover:border-[#ffcdd2] hover:text-[#cf222e]`} title="Remove from your list">
                          <Trash2 size={13} /> Remove
                        </button>
                      )}
                      {b.status !== "CANCELLED" && (
                        <Link href={`/business/bookings/${b._id}/slip`} target="_blank" className={`${btn} border border-[#e1e4e8] bg-[#f6f8fa] text-[#0d1117] hover:bg-[#eef1f4]`}>
                          <FileText size={13} /> Slip
                        </Link>
                      )}
                      {c.phone && (
                        <a
                          href={`https://wa.me/${c.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${c.name}, regarding your booking ${bookingNumber(b._id)}`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className={`${btn} border border-[#e1e4e8] bg-white text-[#1a7f37] hover:bg-[#dafbe1]`}
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                    {b.createdBy?.name && <p className="text-[10px] text-[#8c959f]">Booked by {b.createdBy.name}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
