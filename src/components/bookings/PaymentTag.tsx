"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, Clock3, CircleDollarSign, PieChart, X, type LucideIcon } from "lucide-react";
import { PAYMENT_LABEL, paymentState, type PaymentStatus } from "@/lib/payments";

const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString()}`;

const TAG_STYLE: Record<PaymentStatus, { cls: string; icon: LucideIcon }> = {
  PENDING: { cls: "bg-amber-50 text-amber-700 ring-amber-200", icon: Clock3 },
  PARTIAL: { cls: "bg-sky-50 text-sky-700 ring-sky-200", icon: PieChart },
  PAID: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: CheckCircle2 },
};

type Payable = { totalAmount: number; deposit: number; lateFee?: number; extraCharges?: number; amountPaid?: number };

/**
 * The booking's payment tag: Payment pending, Partly paid (with what's left) or Paid.
 * Clickable when `onClick` is given, so the owner can change it.
 */
export function PaymentTag({ booking, onClick, className = "" }: { booking: Payable; onClick?: () => void; className?: string }) {
  const p = paymentState(booking);
  const { cls, icon: Icon } = TAG_STYLE[p.status];
  const text = p.status === "PARTIAL" ? `${PAYMENT_LABEL.PARTIAL} · ${pkr(p.balance)} left` : PAYMENT_LABEL[p.status];
  const body = <><Icon size={11} strokeWidth={2.4} /> {text}</>;
  const base = `inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${cls} ${className}`;
  return onClick ? (
    <button type="button" onClick={onClick} title="Update payment" className={`${base} transition hover:brightness-95`}>{body}</button>
  ) : (
    <span className={base}>{body}</span>
  );
}

/**
 * Lets the owner record the payment: pending, partly paid (how much) or paid in full.
 * `onSave` returns an error message, or null when it worked.
 */
export function PaymentDialog({ open, onOpenChange, booking, customer, onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Payable | null;
  customer?: string;
  onSave: (body: { status: PaymentStatus; amountPaid?: number }) => Promise<string | null>;
}) {
  const [choice, setChoice] = useState<PaymentStatus>("PENDING");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openedFor, setOpenedFor] = useState<Payable | null>(null);

  const now = booking ? paymentState(booking) : null;
  // Start from the booking's current payment each time it opens
  const key = open ? booking : null;
  if (key !== openedFor) {
    setOpenedFor(key);
    setChoice(now?.status ?? "PENDING");
    setAmount(now && now.status === "PARTIAL" ? String(now.paid) : "");
    setError("");
  }

  const due = now?.due ?? 0;
  const partAmount = Number(amount);
  const partValid = choice !== "PARTIAL" || (Number.isFinite(partAmount) && partAmount > 0 && partAmount < due);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!partValid) { setError(`Enter an amount between 1 and ${pkr(due - 1)}`); return; }
    setSaving(true);
    setError("");
    const err = await onSave(choice === "PARTIAL" ? { status: choice, amountPaid: Math.round(partAmount) } : { status: choice });
    setSaving(false);
    if (err) setError(err);
  }

  const options: { id: PaymentStatus; title: string; hint: string }[] = [
    { id: "PENDING", title: PAYMENT_LABEL.PENDING, hint: "Nothing received yet" },
    { id: "PARTIAL", title: PAYMENT_LABEL.PARTIAL, hint: "Some money received, the rest later" },
    { id: "PAID", title: PAYMENT_LABEL.PAID, hint: `The full ${pkr(due)} received` },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={o => !saving && onOpenChange(o)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-slate-950/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] max-h-[calc(100vh-32px)] w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"><CircleDollarSign size={18} /></span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-base font-semibold text-slate-900">Payment</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">
                {customer ? `How much has ${customer} paid?` : "How much has the renter paid?"} Total owed: <strong className="text-slate-900">{pkr(due)}</strong>
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></Dialog.Close>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <div role="radiogroup" aria-label="Payment" className="space-y-2">
              {options.map(o => {
                const { cls, icon: Icon } = TAG_STYLE[o.id];
                const on = choice === o.id;
                return (
                  <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => { setChoice(o.id); setError(""); }}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${on ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200 hover:border-slate-300"}`}>
                    <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${cls}`}><Icon size={15} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900">{o.title}</span>
                      <span className="block text-xs text-slate-500">{o.hint}</span>
                    </span>
                    <span className={`h-4 w-4 flex-shrink-0 rounded-full border-2 ${on ? "border-[5px] border-slate-900" : "border-slate-300"}`} />
                  </button>
                );
              })}
            </div>

            {choice === "PARTIAL" && (
              <div>
                <label htmlFor="amount-paid" className="mb-1.5 block text-xs font-semibold text-slate-900">Amount received (PKR)</label>
                <input id="amount-paid" type="number" inputMode="numeric" min={1} max={due - 1} autoFocus value={amount}
                  onChange={e => setAmount(e.target.value)} placeholder="e.g. 2000"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold tabular-nums text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10" />
                {partValid && amount && (
                  <p className="mt-1.5 text-xs text-slate-500">Still to pay: <strong className="text-slate-900">{pkr(due - partAmount)}</strong></p>
                )}
              </div>
            )}

            {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>}
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Dialog.Close asChild>
                <button type="button" disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              </Dialog.Close>
              <button type="submit" disabled={saving || !partValid} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? "Saving…" : "Save payment"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
