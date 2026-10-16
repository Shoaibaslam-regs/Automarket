"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ShieldCheck, X } from "lucide-react";
import { DEPOSIT_LABEL, depositState, type DepositStatus } from "@/lib/checklist";

const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString()}`;

type DepositBooking = { deposit: number; depositRefunded?: number; depositNote?: string; depositSettledAt?: string | null };

const TAG_STYLE: Record<DepositStatus, string> = {
  NONE: "bg-slate-100 text-slate-500",
  HELD: "bg-amber-50 text-amber-700 ring-amber-200",
  REFUNDED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PART_KEPT: "bg-sky-50 text-sky-700 ring-sky-200",
  KEPT: "bg-rose-50 text-rose-700 ring-rose-200",
};

/** Small tag showing where the security deposit stands; clickable for the owner. */
export function DepositTag({ booking, onClick }: { booking: DepositBooking; onClick?: () => void }) {
  const s = depositState(booking);
  if (s.status === "NONE") return null;
  const cls = `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${TAG_STYLE[s.status]}`;
  const text = <><ShieldCheck size={10} /> {DEPOSIT_LABEL[s.status]}{s.status === "PART_KEPT" ? ` · ${pkr(s.kept)} kept` : ""}</>;
  return onClick ? <button type="button" onClick={onClick} className={`${cls} hover:opacity-80`}>{text}</button> : <span className={cls}>{text}</span>;
}

/**
 * Settles the security deposit once the vehicle is back: refund all of it, or keep some with a reason
 * (damage, fuel, unpaid late fee). `onSave` returns an error message, or null when it worked.
 */
export default function DepositDialog({ open, onOpenChange, booking, customer, onSave }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  booking: DepositBooking | null;
  customer?: string;
  onSave: (body: { refunded: number; note: string }) => Promise<string | null>;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openedFor, setOpenedFor] = useState<DepositBooking | null>(null);
  const b = open ? booking : null;
  if (b !== openedFor) {
    setOpenedFor(b);
    setAmount(b ? String(b.depositSettledAt ? b.depositRefunded ?? 0 : b.deposit) : "");
    setNote(b?.depositNote ?? "");
    setError("");
  }
  if (!booking) return null;

  const refunded = Math.round(Number(amount));
  const valid = amount.trim() !== "" && Number.isFinite(refunded) && refunded >= 0 && refunded <= booking.deposit;
  const kept = valid ? booking.deposit - refunded : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) { setError(`Enter an amount from 0 to ${pkr(booking!.deposit)}`); return; }
    if (kept > 0 && !note.trim()) { setError("Say why part of the deposit is kept"); return; }
    setSaving(true);
    setError("");
    const err = await onSave({ refunded, note: note.trim() });
    setSaving(false);
    if (err) setError(err);
  }

  return (
    <Dialog.Root open={open} onOpenChange={o => !saving && onOpenChange(o)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-slate-950/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] max-h-[calc(100vh-32px)] w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"><ShieldCheck size={18} /></span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-base font-semibold text-slate-900">Settle security deposit</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">{customer ? `${customer} paid` : "Deposit"} {pkr(booking.deposit)}. How much did you give back?</Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></Dialog.Close>
          </div>
          <form onSubmit={submit} className="mt-5 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setAmount(String(booking.deposit))}
                className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${refunded === booking.deposit && valid ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200 hover:border-slate-300"}`}>
                Full refund<span className="block font-normal text-slate-500">{pkr(booking.deposit)} back</span>
              </button>
              <button type="button" onClick={() => setAmount("0")}
                className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${refunded === 0 && valid ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200 hover:border-slate-300"}`}>
                Keep all<span className="block font-normal text-slate-500">Nothing back</span>
              </button>
            </div>
            <div>
              <label htmlFor="dep-amount" className="mb-1 block text-xs font-semibold text-slate-900">Refunded to the renter (PKR)</label>
              <input id="dep-amount" type="number" min={0} max={booking.deposit} inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10" />
              {valid && kept > 0 && <p className="mt-1 text-[11px] font-semibold text-rose-600">{pkr(kept)} kept</p>}
            </div>
            {kept > 0 && (
              <input value={note} onChange={e => setNote(e.target.value)} maxLength={300} aria-label="Reason" placeholder="Why it's kept, e.g. scratch on bumper, fuel not full"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10" />
            )}
            {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>}
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Dialog.Close asChild>
                <button type="button" disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              </Dialog.Close>
              <button type="submit" disabled={saving || !valid} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
            <p className="text-center text-[11px] text-slate-400">The refund is added to your cash book and printed on the slip.</p>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
