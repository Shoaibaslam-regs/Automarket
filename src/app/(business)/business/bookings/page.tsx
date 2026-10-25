"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertTriangle, CalendarCheck, IdCard, MessageCircle, MoreHorizontal, Pencil, Tag, CalendarDays, Car, CheckCircle2, Clock3, FileText, KeyRound, Phone, Plus, Search,
  CalendarRange, Gauge, List as ListIcon, ShieldCheck, Store, Trash2, Undo2, UserRound, Wallet, X,
} from "lucide-react";
import Select from "@/components/ui/Select";
import ConfirmDialog from "@/components/business/ConfirmDialog";
import { refreshNotificationCounts } from "@/hooks/useNotificationCounts";
import { BOOKING_STATUSES, bookingDailyRate, bookingNumber, rentalDays, type BookingStatus } from "@/lib/bookings";
import AvailabilityControl from "@/components/listings/AvailabilityControl";
import HandoverDialog, { PlateBadge, fmtDateTime } from "@/components/bookings/HandoverDialog";
import ReturnDialog from "@/components/bookings/ReturnDialog";
import { PaymentDialog, PaymentTag } from "@/components/bookings/PaymentTag";
import type { PaymentStatus } from "@/lib/payments";
import { bookingCnic } from "@/lib/plates";
import { kmDriven, type Check } from "@/lib/checklist";
import { conditionText } from "@/components/bookings/ConditionFields";
import DepositDialog, { DepositTag } from "@/components/bookings/DepositDialog";
import BookingCalendar from "@/components/bookings/BookingCalendar";
import Tip from "@/components/ui/Tip";
import { useQuickNew } from "@/components/business/QuickNew";
import StatusText from "@/components/ui/StatusText";

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
  plateNumber?: string;
  renterCnic?: string;
  /** Exact return time set at handover */
  dueBackAt?: string;
  returnedAt?: string;
  lateDays?: number;
  lateFee?: number;
  /** Condition at handover and return, extra charges at return, and the deposit settlement */
  checkOut?: Check | null;
  checkIn?: Check | null;
  extraCharges?: number;
  extraChargesNote?: string;
  depositRefunded?: number;
  depositNote?: string;
  depositSettledAt?: string | null;
  /** What the renter has paid so far; drives the payment tag */
  amountPaid?: number;
  createdAt: string;
  renterId?: { name?: string; email: string; phone?: string } | null;
  createdBy?: { name?: string } | null;
  offListVehicle?: { title: string; dailyRate: number; deposit: number } | null;
  /** Set for bookings of a rent deal (package) instead of a listed vehicle */
  dealId?: { _id: string; title: string; images: string[]; vehicleCount?: number } | null;
  rentalId?: { _id?: string; dailyRate: number; plateNumber?: string; listingId?: { _id: string; title: string; make: string; model: string; images: string[]; type: string; status: string } | null } | null;
};

/** Handover and return condition side by side, with photos, for the card's More tray. */
function ConditionSummary({ b }: { b: Booking }) {
  const rows = [["Out", b.checkOut], ["Back", b.checkIn]] as const;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map(([label, c]) => c && (
        <div key={label} className="rounded-lg border border-[var(--gh-e1e4e8)] bg-white p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--gh-8c959f)]">{label}</p>
          <p className="text-[11px] font-semibold text-[var(--gh-0d1117)]">{conditionText(c) || "—"}</p>
          {c.notes && <p className="text-[11px] text-[var(--gh-57606a)]">{c.notes}</p>}
          {!!c.photos?.length && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {c.photos.map(url => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="relative h-10 w-10 overflow-hidden rounded-md ring-1 ring-[var(--gh-e1e4e8)]">
                  <Image src={url} alt={`${label} photo`} fill sizes="40px" className="object-cover" />
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Out past its return time: the exact time given at handover, or the end date for older bookings. */
function isOverdue(b: Booking, now: number): boolean {
  return b.status === "ACTIVE" && now > 0 && new Date(b.dueBackAt ?? b.endDate).getTime() < now;
}

type Vehicle = { rentalId: string; title: string; image: string | null; dailyRate: number; deposit: number };
type CustomerOption = { _id: string; name: string; phone: string; email?: string };

const STATUS_STYLE: Record<BookingStatus, { bg: string; color: string; label: string }> = {
  PENDING: { bg: "var(--gh-fff8c5)", color: "var(--gh-7d4e00)", label: "Pending" },
  CONFIRMED: { bg: "var(--gh-ddf4ff)", color: "var(--gh-0550ae)", label: "Confirmed" },
  ACTIVE: { bg: "var(--gh-dafbe1)", color: "var(--gh-1a7f37)", label: "Out now" },
  COMPLETED: { bg: "var(--gh-f6f8fa)", color: "var(--gh-57606a)", label: "Completed" },
  CANCELLED: { bg: "var(--gh-fff0f0)", color: "var(--gh-cf222e)", label: "Cancelled" },
};

const fmt = (d: string) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
const pkr = (n: number) => `PKR ${n.toLocaleString()}`;
const toInputDate = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

/** What was booked: the deal for deal bookings, otherwise the listed vehicle. */
const bookedTitle = (b: Booking) => b.dealId?.title ?? b.rentalId?.listingId?.title ?? b.offListVehicle?.title ?? "Vehicle";

function customerOf(b: Booking) {
  // Walk-ins, and online bookings whose renter later deleted their account, keep the details on the booking
  if (b.walkIn && (b.source === "WALK_IN" || !b.renterId)) return { name: b.walkIn.name, phone: b.walkIn.phone, email: b.walkIn.email };
  return { name: b.renterId?.name || "Customer", phone: b.renterId?.phone, email: b.renterId?.email };
}

const EMPTY_FORM = {
  rentalId: "", customerId: "", name: "", phone: "", email: "", cnic: "", startDate: "", endDate: "", notes: "", status: "CONFIRMED",
  // A vehicle that isn't listed on AutoGO (rentalId "other")
  offTitle: "", offPlate: "", offRate: "", offDeposit: "",
};
const OTHER_VEHICLE = "other";

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

  const other = form.rentalId === OTHER_VEHICLE;
  const listed = vehicles.find(v => v.rentalId === form.rentalId);
  // Rates for the price summary: from the listed vehicle or deal, or typed in for an unlisted vehicle
  const vehicle = other
    ? (Number(form.offRate) > 0 ? { dailyRate: Number(form.offRate), deposit: Number(form.offDeposit) || 0 } : undefined)
    : listed;
  // Returning the same day is allowed and counts as one day
  const validDates = form.startDate && form.endDate && form.endDate >= form.startDate;
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
        offList: other ? { title: form.offTitle, plateNumber: form.offPlate || undefined, dailyRate: Number(form.offRate), deposit: form.offDeposit } : undefined,
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

  const input = "h-10 w-full rounded-lg border border-[var(--gh-d0d7de)] bg-white px-3 text-[13px] text-[var(--gh-0d1117)] outline-none transition focus:border-[var(--gh-0d1117)] focus:ring-2 focus:ring-[var(--gh-0d1117)]/10";
  const label = "mb-1.5 block text-xs font-semibold text-[var(--gh-0d1117)]";
  const today = toInputDate(new Date());

  return (
    <Dialog.Root open={open} onOpenChange={close}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] flex max-h-[calc(100vh-32px)] w-[calc(100%-32px)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl focus:outline-none">
          <div className="flex items-center justify-between border-b border-[var(--gh-e1e4e8)] px-5 py-4">
            <Dialog.Title className="flex items-center gap-2.5 text-[15px] font-bold text-[var(--gh-0d1117)]">
              <span className="flex items-center justify-center text-[var(--gh-0d1117)]"><CalendarCheck size={15} /></span>
              New walk-in booking
            </Dialog.Title>
            <Dialog.Close aria-label="Close" disabled={saving} className="rounded-full p-1 text-[var(--gh-8c959f)] hover:bg-[var(--gh-f6f8fa)] hover:text-[var(--gh-0d1117)]"><X size={18} /></Dialog.Close>
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
                  options={[
                    ...vehicles.map(v => ({ value: v.rentalId, label: `${v.title} · ${pkr(v.dailyRate)}/day` })),
                    { value: OTHER_VEHICLE, label: "Other vehicle (not listed on AutoGO)" },
                  ]}
                  className="h-10 rounded-lg border-[var(--gh-d0d7de)] text-[13px] font-normal"
                />
              </div>

              {other && (
                <div className="rounded-xl bg-[var(--gh-f6f8fa)] p-4 ring-1 ring-inset ring-[var(--gh-e1e4e8)]">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--gh-57606a)]"><Car size={13} /> Unlisted vehicle</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className={label} htmlFor="bk-off-title">Vehicle *</label>
                      <input id="bk-off-title" required minLength={2} maxLength={100} value={form.offTitle} onChange={e => set("offTitle", e.target.value)} placeholder="Toyota Corolla 2020, white" className={input} />
                    </div>
                    <div>
                      <label className={label} htmlFor="bk-off-plate">Number plate</label>
                      <input id="bk-off-plate" value={form.offPlate} onChange={e => set("offPlate", e.target.value.toUpperCase())} placeholder="LEA-1234 (optional)" className={`${input} uppercase`} />
                    </div>
                    <div>
                      <label className={label} htmlFor="bk-off-rate">Daily rate (PKR) *</label>
                      <input id="bk-off-rate" type="number" required min={1} value={form.offRate} onChange={e => set("offRate", e.target.value)} placeholder="5000" className={input} />
                    </div>
                    <div>
                      <label className={label} htmlFor="bk-off-deposit">Deposit (PKR)</label>
                      <input id="bk-off-deposit" type="number" min={0} value={form.offDeposit} onChange={e => set("offDeposit", e.target.value)} placeholder="0" className={input} />
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-[var(--gh-8c959f)]">For cars in your fleet that you haven&apos;t listed. With a number plate, the same car can&apos;t be double-booked.</p>
                </div>
              )}

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

              <div className="rounded-xl bg-[var(--gh-f6f8fa)] p-4 ring-1 ring-inset ring-[var(--gh-e1e4e8)]">
                <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--gh-57606a)]"><UserRound size={13} /> Customer</p>
                {customers.length > 0 && (
                  <div className="mb-3">
                    <Select
                      value={form.customerId}
                      onChange={pickCustomer}
                      ariaLabel="Existing customer"
                      placeholder="Pick from your customers (optional)"
                      options={customers.map(c => ({ value: c._id, label: `${c.name} · ${c.phone}` }))}
                      className="h-10 rounded-lg border-[var(--gh-d0d7de)] bg-white text-[13px] font-normal"
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
                    className="h-10 rounded-lg border-[var(--gh-d0d7de)] text-[13px] font-normal"
                  />
                </div>
              </div>

              {vehicle && validDates && (
                <div className="rounded-xl bg-[var(--gh-0d1117)] p-4 text-white">
                  <div className="flex justify-between text-[13px] text-white/70"><span>{days} day{days !== 1 ? "s" : ""} × {pkr(vehicle.dailyRate)}</span><span>{pkr(rent)}</span></div>
                  <div className="mt-1 flex justify-between text-[13px] text-white/70"><span>Security deposit (refundable)</span><span>{pkr(vehicle.deposit)}</span></div>
                  <div className="mt-3 flex justify-between border-t border-white/15 pt-3 text-sm font-bold"><span>Due at pickup</span><span>{pkr(rent + vehicle.deposit)}</span></div>
                </div>
              )}

              {error && <div role="alert" className="rounded-lg border border-[var(--gh-ffcdd2)] bg-[var(--gh-fff0f0)] px-3 py-2.5 text-[13px] text-[var(--gh-cf222e)]">{error}</div>}
            </div>

            <div className="flex justify-end gap-2 border-t border-[var(--gh-e1e4e8)] px-5 py-4">
              <Dialog.Close asChild>
                <button type="button" disabled={saving} className="rounded-lg border border-[var(--gh-e1e4e8)] bg-[var(--gh-f6f8fa)] px-4 py-2 text-[13px] font-semibold text-[var(--gh-0d1117)]">Cancel</button>
              </Dialog.Close>
              <button type="submit" disabled={saving || !form.rentalId} className="rounded-lg bg-[var(--gh-0d1117)] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
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
  // Links from the dashboard's Today list open with ?q=<booking or sale number> already searched
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) queueMicrotask(() => setSearch(q));
  }, []);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [updating, setUpdating] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  useQuickNew("booking", () => setNewOpen(true));
  const [created, setCreated] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Booking | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Booking | null>(null);
  const [removeError, setRemoveError] = useState("");
  // Handing over asks for the number plate and renter's CNIC; both can be corrected later
  // `due` prefills the return time at handover: the booked days counted as 24-hour periods from now
  const [plateFor, setPlateFor] = useState<{ booking: Booking; handover: boolean; due?: string } | null>(null);
  const [returnFor, setReturnFor] = useState<Booking | null>(null);
  const [payFor, setPayFor] = useState<Booking | null>(null);
  const [depositFor, setDepositFor] = useState<Booking | null>(null);
  // Booking whose "More" tray is open
  const [openMore, setOpenMore] = useState<string | null>(null);
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

  // Every booking of the same vehicle shows its tag, so update them all together
  function setVehicleStatus(listingId: string, status: string) {
    setBookings(prev => prev.map(x => {
      const l = x.rentalId?.listingId;
      return l && l._id === listingId ? { ...x, rentalId: { ...x.rentalId!, listingId: { ...l, status } } } : x;
    }));
  }

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

  async function savePayment(body: { status: PaymentStatus; amountPaid?: number }): Promise<string | null> {
    if (!payFor) return null;
    const res = await fetch(`/api/bookings/${payFor._id}/payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return data.error || "Couldn't save the payment";
    const id = payFor._id;
    setBookings(prev => prev.map(x => (x._id === id ? { ...x, amountPaid: data.amountPaid } : x)));
    setPayFor(null);
    return null;
  }

  async function saveReturn(details: { returnedAt: string }): Promise<string | null> {
    if (!returnFor) return null;
    const res = await fetch(`/api/business/bookings/${returnFor._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED", ...details }),
    });
    if (!res.ok) return (await res.json().catch(() => ({}))).error || "Couldn't mark the booking returned";
    setReturnFor(null);
    fetchBookings();
    return null;
  }

  function openHandover(b: Booking) {
    // `now` is refreshed on every load, so it's the moment of handover to within a few minutes; the owner can adjust
    const due = new Date(now + rentalDays(b.startDate, b.endDate) * 24 * 60 * 60 * 1000);
    due.setSeconds(0, 0);
    setPlateFor({ booking: b, handover: true, due: due.toISOString() });
  }

  async function saveDeposit(body: { refunded: number; note: string }): Promise<string | null> {
    if (!depositFor) return null;
    const res = await fetch(`/api/bookings/${depositFor._id}/deposit`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return data.error || "Couldn't save the deposit";
    const id = depositFor._id;
    setBookings(prev => prev.map(x => (x._id === id ? { ...x, depositRefunded: data.depositRefunded, depositNote: data.depositNote ?? undefined, depositSettledAt: data.depositSettledAt } : x)));
    setDepositFor(null);
    return null;
  }

  async function saveHandover(details: { plateNumber: string; cnic: string; dueBackAt?: string; checkOut?: Check }): Promise<string | null> {
    if (!plateFor) return null;
    const { booking: b, handover } = plateFor;
    const res = handover
      ? await fetch(`/api/business/bookings/${b._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "ACTIVE", ...details }) })
      : await fetch(`/api/bookings/${b._id}/handover`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(details) });
    if (!res.ok) return (await res.json().catch(() => ({}))).error || "Couldn't save the handover details";
    setPlateFor(null);
    fetchBookings();
    return null;
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
    const revenue = bookings.filter(b => b.status === "COMPLETED").reduce((s, b) => s + b.totalAmount + (b.lateFee ?? 0) + (b.extraCharges ?? 0), 0);
    return {
      pending: bookings.filter(b => b.status === "PENDING").length,
      upcoming: bookings.filter(b => b.status === "CONFIRMED").length,
      out: bookings.filter(b => b.status === "ACTIVE").length,
      overdue: bookings.filter(b => isOverdue(b, now)).length,
      revenue,
    };
  }, [bookings, now]);

  const q = search.trim().toLowerCase();
  const filtered = bookings.filter(b => {
    if (statusFilter && b.status !== statusFilter) return false;
    if (!q) return true;
    const c = customerOf(b);
    return [bookingNumber(b._id), c.name, c.phone ?? "", bookedTitle(b), b.dealId ? "deal" : ""].some(v => v.toLowerCase().includes(q));
  });


  return (
    <div className="min-h-screen bg-[var(--gh-f6f8fa)]">
      <NewBookingDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        vehicles={vehicles}
        onCreated={id => { setNewOpen(false); setCreated(id); fetchBookings(); }}
      />
      <HandoverDialog
        open={plateFor !== null}
        onOpenChange={o => !o && setPlateFor(null)}
        title={plateFor?.handover ? "Hand over vehicle" : "Handover details"}
        description={plateFor?.handover
          ? `Record the number plate of the ${bookedTitle(plateFor.booking)} and ${customerOf(plateFor.booking).name}'s CNIC. Both are printed on the booking slip.`
          : "Correct the number plate and CNIC shown on this booking and its slip."}
        confirmLabel={plateFor?.handover ? "Hand over" : "Save details"}
        initialPlate={plateFor ? plateFor.booking.plateNumber ?? plateFor.booking.rentalId?.plateNumber : undefined}
        initialCnic={plateFor ? bookingCnic(plateFor.booking) : undefined}
        askReturnTime={!!plateFor && (plateFor.handover || plateFor.booking.status === "ACTIVE")}
        initialDueBackAt={plateFor ? plateFor.due ?? plateFor.booking.dueBackAt : undefined}
        askCondition={!!plateFor?.handover}
        onSave={saveHandover}
      />
      <PaymentDialog
        open={payFor !== null}
        onOpenChange={o => !o && setPayFor(null)}
        booking={payFor}
        customer={payFor ? customerOf(payFor).name : undefined}
        onSave={savePayment}
      />
      <ReturnDialog
        open={returnFor !== null}
        onOpenChange={o => !o && setReturnFor(null)}
        vehicle={returnFor ? bookedTitle(returnFor) : ""}
        customer={returnFor ? customerOf(returnFor).name : ""}
        dueBackAt={returnFor?.dueBackAt}
        dailyRate={returnFor ? bookingDailyRate(returnFor) : 0}
        checkOutKm={returnFor?.checkOut?.odometer}
        onSave={saveReturn}
      />
      <DepositDialog
        open={depositFor !== null}
        onOpenChange={o => !o && setDepositFor(null)}
        booking={depositFor}
        customer={depositFor ? customerOf(depositFor).name : undefined}
        onSave={saveDeposit}
      />
      <ConfirmDialog
        open={confirmCancel !== null}
        onOpenChange={o => !o && setConfirmCancel(null)}
        title={`${confirmCancel?.status === "PENDING" ? "Decline" : "Cancel"} booking ${confirmCancel ? bookingNumber(confirmCancel._id) : ""}`}
        description={confirmCancel && (
          <>
            {customerOf(confirmCancel).name}&apos;s booking for <strong style={{ color: "var(--gh-0d1117)" }}>{bookedTitle(confirmCancel)}</strong> ({fmt(confirmCancel.startDate)} → {fmt(confirmCancel.endDate)}) will be cancelled and the dates freed up.
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
            This {confirmRemove.status === "COMPLETED" ? "completed" : "cancelled"} booking for <strong style={{ color: "var(--gh-0d1117)" }}>{customerOf(confirmRemove).name}</strong> will be
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--gh-e1e4e8)] bg-white px-4 py-5 sm:px-6">
        <div className="min-w-0">
          <Link href="/business/dashboard" className="text-xs text-[var(--gh-57606a)] hover:text-[var(--gh-0d1117)]">← Dashboard</Link>
          <h1 className="mt-1 text-lg font-bold text-[var(--gh-0d1117)]">Bookings</h1>
          <p className="mt-0.5 text-xs text-[var(--gh-57606a)]">Rental requests, walk-in bookings, handovers and slips for your whole fleet</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/sell" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-3.5 py-2.5 text-[13px] font-semibold text-[var(--gh-0d1117)] transition hover:bg-[var(--gh-f6f8fa)]">
            <KeyRound size={14} /> Add rental vehicle
          </Link>
          {canManage && (
            <button
              onClick={() => setNewOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--gh-0d1117)] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[var(--gh-24292f)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={15} strokeWidth={2.2} /> New booking
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6">
        {created && (
          <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--gh-56d364)] bg-[var(--gh-dafbe1)] px-4 py-3 text-[13px] text-[var(--gh-1a7f37)]">
            <span className="flex items-center gap-2"><CheckCircle2 size={16} /> Booking {bookingNumber(created)} created.</span>
            <span className="flex gap-2">
              <Link href={`/business/bookings/${created}/slip`} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--gh-1a7f37)] px-3 py-1.5 text-xs font-semibold text-white">
                <FileText size={13} /> Print slip
              </Link>
              <button onClick={() => setCreated(null)} aria-label="Dismiss" className="rounded-lg px-2 text-[var(--gh-1a7f37)] hover:bg-white/50"><X size={14} /></button>
            </span>
          </div>
        )}
        {actionError && <div role="alert" className="mb-4 rounded-xl border border-[var(--gh-ffcdd2)] bg-[var(--gh-fff0f0)] px-4 py-3 text-[13px] text-[var(--gh-cf222e)]">{actionError}</div>}

        {/* Stats */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Pending requests", value: stats.pending, icon: Clock3, color: "var(--gh-7d4e00)" },
            { label: "Upcoming pickups", value: stats.upcoming, icon: CalendarDays, color: "var(--gh-0550ae)" },
            { label: "Out now", value: stats.out, icon: Car, color: "var(--gh-1a7f37)", hint: stats.overdue ? `${stats.overdue} overdue` : undefined },
            { label: "Completed revenue", value: pkr(stats.revenue), icon: CheckCircle2, color: "var(--gh-0d1117)" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-[var(--gh-e1e4e8)] bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-[var(--gh-8c959f)]">{s.label}</p>
                <s.icon size={16} className="flex-shrink-0" style={{ color: s.color }} />
              </div>
              <p className="mt-2 truncate text-xl font-extrabold tabular-nums" style={{ color: s.color }}>{s.value}</p>
              {s.hint && <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-[var(--gh-cf222e)]"><AlertTriangle size={11} /> {s.hint}</p>}
            </div>
          ))}
        </div>

        {/* List or calendar */}
        <div role="tablist" aria-label="View" className="mb-4 inline-flex rounded-lg border border-[var(--gh-e1e4e8)] bg-white p-0.5">
          {([["list", "List", ListIcon], ["calendar", "Calendar", CalendarRange]] as const).map(([id, label, Icon]) => (
            <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${view === id ? "bg-[var(--gh-0d1117)] text-white" : "text-[var(--gh-57606a)]"}`}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {view === "calendar" ? (
          <BookingCalendar bookings={bookings} vehicles={vehicles}
            onOpen={b => { setView("list"); setStatusFilter(""); setSearch(bookingNumber(b._id)); }} />
        ) : (<>
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
                  className={`rounded-full border px-3.5 py-1.5 text-xs transition ${active ? "border-[var(--gh-0d1117)] bg-[var(--gh-0d1117)] font-semibold text-white" : "border-[var(--gh-e1e4e8)] bg-white text-[var(--gh-57606a)] hover:border-[var(--gh-d0d7de)]"}`}
                >
                  {s ? STATUS_STYLE[s].label : "All"} <span className={active ? "text-white/70" : "text-[var(--gh-8c959f)]"}>({count})</span>
                </button>
              );
            })}
          </div>
          <div className="relative lg:w-72">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gh-8c959f)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Booking no, customer, phone, vehicle…"
              className="h-10 w-full rounded-xl border border-[var(--gh-e1e4e8)] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[var(--gh-0d1117)] focus:ring-2 focus:ring-[var(--gh-0d1117)]/10"
            />
          </div>
        </div>

        {/* List: one column, two on wide screens */}
        <div className="grid items-start gap-3 xl:grid-cols-2">
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="h-[132px] animate-pulse rounded-2xl bg-white" />)
          ) : loadError ? (
            <div className="rounded-2xl border border-[var(--gh-ffcdd2)] bg-[var(--gh-fff0f0)] p-6 text-center text-sm text-[var(--gh-cf222e)] xl:col-span-2">{loadError}</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-[var(--gh-e1e4e8)] bg-white px-6 py-14 text-center xl:col-span-2">
              <div className="mb-3 flex justify-center text-[var(--gh-8c959f)]"><CalendarCheck size={30} strokeWidth={1.5} /></div>
              <p className="text-sm font-semibold text-[var(--gh-0d1117)]">{bookings.length === 0 ? "No bookings yet" : "No bookings match your filters"}</p>
              <p className="mt-1 text-[13px] text-[var(--gh-57606a)]">
                {bookings.length === 0 && canManage
                  ? "Online requests appear here. Use New booking for walk-in customers, even for vehicles you haven't listed."
                  : bookings.length === 0 ? "Online requests appear here." : "Try another status, or clear the search."}
              </p>
              {bookings.length === 0 ? (
                canManage && <button onClick={() => setNewOpen(true)} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--gh-0d1117)] px-4 py-2.5 text-[13px] font-semibold text-white"><Plus size={15} /> Make your first booking</button>
              ) : (
                <button onClick={() => { setStatusFilter(""); setSearch(""); }} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-4 py-2.5 text-[13px] font-semibold text-[var(--gh-0d1117)]">Clear filters</button>
              )}
            </div>
          ) : filtered.map(b => {
            const s = STATUS_STYLE[b.status] ?? STATUS_STYLE.PENDING;
            const listing = b.rentalId?.listingId;
            const photo = b.dealId?.images?.[0] ?? listing?.images?.[0];
            const c = customerOf(b);
            const days = rentalDays(b.startDate, b.endDate);
            const overdue = isOverdue(b, now);
            const busy = updating === b._id;
            const moreOpen = openMore === b._id;
            const showHandover = !!(b.plateNumber || bookingCnic(b));
            const canEditHandover = canManage && (b.status === "ACTIVE" || b.status === "COMPLETED");
            const primary =
              !canManage ? null
              : b.status === "PENDING" ? { label: "Confirm", icon: CheckCircle2, onClick: () => updateStatus(b, "CONFIRMED"), cls: "bg-[var(--gh-2da44e)] hover:bg-[var(--gh-2c974b)]" }
              : b.status === "CONFIRMED" ? { label: "Hand over", icon: KeyRound, onClick: () => openHandover(b), cls: "bg-[var(--gh-0d1117)] hover:bg-[var(--gh-24292f)]" }
              : b.status === "ACTIVE" ? { label: "Mark returned", icon: Undo2, onClick: () => setReturnFor(b), cls: "bg-[var(--gh-0d1117)] hover:bg-[var(--gh-24292f)]" }
              : null;
            const iconBtn = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-2.5 text-xs font-semibold transition hover:bg-[var(--gh-f6f8fa)] disabled:opacity-50";
            const trayBtn = "inline-flex items-center gap-1.5 rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";
            return (
              <div key={b._id} className={`overflow-hidden rounded-2xl border bg-white ${overdue ? "border-[var(--gh-ffcdd2)]" : "border-[var(--gh-e1e4e8)]"}`}>
                <div className="p-3.5 sm:p-4">
                  {/* Vehicle, reference and dates */}
                  <div className="flex gap-3">
                    <div className="relative h-14 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-[var(--gh-f6f8fa)] sm:h-16 sm:w-20">
                      {photo
                        ? <Image src={photo} alt="" fill sizes="80px" className="object-cover" />
                        : <div className="flex h-full items-center justify-center text-[var(--gh-8c959f)]"><Car size={18} strokeWidth={1.5} /></div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-[15px] font-bold leading-tight text-[var(--gh-0d1117)]">
                          {bookedTitle(b)}
                          {(b.dealId?.vehicleCount ?? 1) > 1 && <span className="ml-1 text-xs font-medium text-[var(--gh-57606a)]">· {b.dealId!.vehicleCount} cars</span>}
                        </p>
                        {overdue ? (
                          <span className="inline-flex flex-shrink-0 items-center gap-1 text-[10px] font-bold text-[var(--gh-cf222e)]"><AlertTriangle size={10} /> Overdue</span>
                        ) : (
                          <StatusText color={s.color}>{s.label}</StatusText>
                        )}
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-[var(--gh-57606a)]">
                        <span className="font-mono font-bold">{bookingNumber(b._id)}</span>
                        <span aria-hidden>·</span>
                        {b.source === "WALK_IN" ? <span className="inline-flex items-center gap-0.5 font-semibold text-[var(--gh-8250df)]"><Store size={10} /> Walk-in <Tip id="walkIn" size={11} /></span> : <span>Online</span>}
                        {b.dealId && (
                          <span className="theme-static inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-rose-600 to-orange-500 px-1.5 py-px text-[9px] font-extrabold tracking-wide text-white"><Tag size={9} /> DEAL</span>
                        )}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-[var(--gh-0d1117)]">
                        <CalendarDays size={12} className="flex-shrink-0 text-[var(--gh-8c959f)]" />
                        {fmt(b.startDate)} → {fmt(b.endDate)} <span className="text-[var(--gh-8c959f)]">· {days} day{days !== 1 ? "s" : ""}</span>
                      </p>
                    </div>
                  </div>

                  {/* Customer, return time, handover */}
                  <div className="mt-3 space-y-1.5 text-xs">
                    <p className="flex min-w-0 items-center gap-1.5 text-[var(--gh-57606a)]">
                      <UserRound size={12} className="flex-shrink-0 text-[var(--gh-8c959f)]" />
                      <span className="truncate">{c.name}</span>
                      {c.phone && <a href={`tel:${c.phone}`} className="flex flex-shrink-0 items-center gap-1 font-semibold text-[var(--gh-0d1117)]"><Phone size={11} /> {c.phone}</a>}
                    </p>
                    {b.returnedAt ? (
                      <p className="flex items-center gap-1.5 text-[var(--gh-57606a)]"><Undo2 size={12} className="text-[var(--gh-8c959f)]" /> Returned {fmtDateTime(b.returnedAt)}</p>
                    ) : b.dueBackAt && (
                      <p className={`flex items-center gap-1.5 font-semibold ${overdue ? "text-[var(--gh-cf222e)]" : "text-[var(--gh-0d1117)]"}`}>
                        <Clock3 size={12} /> Return by {fmtDateTime(b.dueBackAt)}
                      </p>
                    )}
                    {showHandover && (
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {b.plateNumber && <PlateBadge plate={b.plateNumber} className="!px-1.5 !py-0 text-[10px]" />}
                        {bookingCnic(b) && <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[var(--gh-0d1117)]"><IdCard size={12} className="text-[var(--gh-8c959f)]" /> {bookingCnic(b)}</span>}
                      </p>
                    )}
                    {(b.checkOut || b.checkIn) && (
                      <p className="flex items-center gap-1.5 text-[var(--gh-57606a)]">
                        <Gauge size={12} className="flex-shrink-0 text-[var(--gh-8c959f)]" />
                        <span className="truncate">
                          {kmDriven(b) != null ? <><strong className="text-[var(--gh-0d1117)]">{kmDriven(b)!.toLocaleString()} km</strong> driven</> : conditionText(b.checkIn ?? b.checkOut)}
                        </span>
                      </p>
                    )}
                    {b.notes && <p className="truncate italic text-[var(--gh-8c959f)]">“{b.notes}”</p>}
                  </div>

                  {/* Money */}
                  <div className="mt-3">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <p className="whitespace-nowrap text-base font-extrabold leading-tight tabular-nums text-[var(--gh-0d1117)]">{pkr(b.totalAmount + b.deposit + (b.lateFee ?? 0) + (b.extraCharges ?? 0))}</p>
                      {b.status !== "CANCELLED" && <PaymentTag booking={b} onClick={canManage ? () => setPayFor(b) : undefined} />}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-[var(--gh-8c959f)]">
                      Rent {pkr(b.totalAmount)} · Deposit {pkr(b.deposit)}
                      {(b.lateFee ?? 0) > 0 && <span className="text-[var(--gh-cf222e)]"> · Late {pkr(b.lateFee!)} ({b.lateDays} extra day{b.lateDays !== 1 ? "s" : ""})</span>}
                      {(b.extraCharges ?? 0) > 0 && <span className="text-[var(--gh-cf222e)]"> · Extra {pkr(b.extraCharges!)}{b.extraChargesNote ? ` (${b.extraChargesNote})` : ""}</span>}
                    </p>
                    {b.deposit > 0 && (b.status === "COMPLETED" || (b.status === "CANCELLED" && b.depositSettledAt)) && (
                      <div className="mt-1.5"><DepositTag booking={b} onClick={canManage ? () => setDepositFor(b) : undefined} /></div>
                    )}
                  </div>
                </div>

                {/* Actions: the next step, slip, WhatsApp, and More */}
                <div className="flex items-center gap-1.5 border-t border-[var(--gh-e1e4e8)] px-3.5 py-2.5 sm:px-4">
                  {primary && (
                    <button onClick={primary.onClick} disabled={busy} className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold text-white transition disabled:opacity-50 sm:flex-none ${primary.cls}`}>
                      <primary.icon size={14} /> {primary.label}
                    </button>
                  )}
                  <div className={`flex items-center gap-1.5 ${primary ? "" : "flex-1"}`}>
                    {b.status !== "CANCELLED" && (
                      <Link href={`/business/bookings/${b._id}/slip`} aria-label="Booking slip" className={`${iconBtn} text-[var(--gh-0d1117)]`}>
                        <FileText size={14} /> <span className={primary ? "hidden sm:inline" : ""}>Slip</span>
                      </Link>
                    )}
                    {c.phone && (
                      <a
                        href={`https://wa.me/${c.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${c.name}, regarding your booking ${bookingNumber(b._id)}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="WhatsApp the customer"
                        className={`${iconBtn} text-[var(--gh-1a7f37)]`}
                      >
                        <MessageCircle size={14} /> <span className={primary ? "hidden sm:inline" : ""}>WhatsApp</span>
                      </a>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenMore(moreOpen ? null : b._id)}
                    aria-expanded={moreOpen}
                    aria-label="More actions"
                    className={`${iconBtn} ml-auto ${moreOpen ? "bg-[var(--gh-f6f8fa)] text-[var(--gh-0d1117)]" : "text-[var(--gh-57606a)]"}`}
                  >
                    <MoreHorizontal size={15} /> <span className="hidden sm:inline">More</span>
                  </button>
                </div>

                {/* Less frequent actions */}
                {moreOpen && (
                  <div className="space-y-3 border-t border-[var(--gh-e1e4e8)] bg-[var(--gh-fafbfc)] px-3.5 py-3 sm:px-4">
                    {canManage && (
                      <div className="flex flex-wrap gap-1.5">
                        {b.status !== "CANCELLED" && (
                          <button onClick={() => setPayFor(b)} disabled={busy} className={`${trayBtn} text-[var(--gh-0d1117)] hover:bg-[var(--gh-f6f8fa)]`}>
                            <Wallet size={13} /> Update payment
                          </button>
                        )}
                        {(canEditHandover || (showHandover && b.status !== "CANCELLED")) && (
                          <button onClick={() => setPlateFor({ booking: b, handover: false })} disabled={busy} className={`${trayBtn} text-[var(--gh-0d1117)] hover:bg-[var(--gh-f6f8fa)]`}>
                            <Pencil size={13} /> {showHandover ? "Edit plate, CNIC" : "Add plate & CNIC"}{b.status === "ACTIVE" ? " & return time" : ""}
                          </button>
                        )}
                        {b.deposit > 0 && (b.status === "COMPLETED" || b.status === "CANCELLED") && (
                          <button onClick={() => setDepositFor(b)} disabled={busy} className={`${trayBtn} text-[var(--gh-0d1117)] hover:bg-[var(--gh-f6f8fa)]`}>
                            <ShieldCheck size={13} /> {b.depositSettledAt ? "Edit deposit refund" : "Settle deposit"}
                          </button>
                        )}
                        {(b.status === "PENDING" || b.status === "CONFIRMED") && (
                          <button onClick={() => setConfirmCancel(b)} disabled={busy} className={`${trayBtn} border-[var(--gh-ffcdd2)] text-[var(--gh-cf222e)] hover:bg-[var(--gh-fff0f0)]`}>
                            <X size={13} /> {b.status === "PENDING" ? "Decline request" : "Cancel booking"}
                          </button>
                        )}
                        {(b.status === "COMPLETED" || b.status === "CANCELLED") && (
                          <button onClick={() => { setRemoveError(""); setConfirmRemove(b); }} disabled={busy} className={`${trayBtn} text-[var(--gh-57606a)] hover:border-[var(--gh-ffcdd2)] hover:text-[var(--gh-cf222e)]`}>
                            <Trash2 size={13} /> Remove from list
                          </button>
                        )}
                      </div>
                    )}
                    {canManage && listing?._id && b.status !== "CANCELLED" && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold text-[var(--gh-57606a)]">Vehicle tag</span>
                        <AvailabilityControl
                          key={`${listing._id}-${listing.status}`}
                          id={listing._id}
                          type={listing.type}
                          status={listing.status}
                          allow={["ACTIVE", "RENTED"]}
                          onChanged={s => setVehicleStatus(listing._id, s)}
                        />
                      </div>
                    )}
                    {(b.checkOut || b.checkIn) && <ConditionSummary b={b} />}
                    <p className="text-[11px] text-[var(--gh-8c959f)]">
                      Created {fmt(b.createdAt)}{b.createdBy?.name ? ` by ${b.createdBy.name}` : ""}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </>)}
      </div>
    </div>
  );
}
