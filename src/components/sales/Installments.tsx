"use client";

import { useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, CalendarClock, Check, Printer, Undo2, X } from "lucide-react";
import { MAX_INSTALLMENT_MONTHS, buildSchedule, installmentSummary, type InstallmentPlan } from "@/lib/installments";

const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString()}`;
const day = (d: Date | string) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
const MONTH_CHOICES = [3, 6, 12, 18, 24, 36];

/** Next month's date as "YYYY-MM-DD", the default first installment. */
function nextMonthInput(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function Shell({ open, onOpenChange, busy, title, description, children }: {
  open: boolean; onOpenChange: (o: boolean) => void; busy: boolean; title: string; description: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={o => !busy && onOpenChange(o)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-slate-950/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] max-h-[calc(100vh-32px)] w-[calc(100%-32px)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"><CalendarClock size={18} /></span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-base font-semibold text-slate-900">{title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">{description}</Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Sets up a qist plan: down payment, number of months and the first due date, with a live monthly amount. */
export function InstallmentSetupDialog({ open, onOpenChange, price, paid, buyer, onSave }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  price: number;
  /** Already paid; prefills the down payment */
  paid: number;
  buyer: string;
  onSave: (body: { downPayment: number; months: number; firstDue: string }) => Promise<string | null>;
}) {
  const [down, setDown] = useState("");
  const [months, setMonths] = useState(12);
  const [first, setFirst] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [openedFor, setOpenedFor] = useState(false);
  if (open !== openedFor) {
    setOpenedFor(open);
    if (open) { setDown(paid ? String(paid) : ""); setMonths(12); setFirst(nextMonthInput()); setError(""); }
  }

  const downNum = Math.max(0, Math.round(Number(down) || 0));
  const valid = downNum < price && months >= 1 && months <= MAX_INSTALLMENT_MONTHS && !!first;
  const preview = valid ? buildSchedule(price, downNum, months, first) : [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) { setError("The down payment must be less than the price"); return; }
    setBusy(true);
    setError("");
    const err = await onSave({ downPayment: downNum, months, firstDue: first });
    setBusy(false);
    if (err) setError(err);
  }

  const field = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";
  return (
    <Shell open={open} onOpenChange={onOpenChange} busy={busy} title="Set up installments" description={`${buyer} · price ${pkr(price)}`}>
      <form onSubmit={submit} className="mt-5 space-y-3.5">
        <div>
          <label htmlFor="inst-down" className="mb-1.5 block text-xs font-semibold text-slate-900">Down payment (PKR)</label>
          <input id="inst-down" type="number" min={0} inputMode="numeric" value={down} onChange={e => setDown(e.target.value)} placeholder="0" className={field} />
          {paid > 0 && <p className="mt-1 text-[11px] text-slate-400">Already received {pkr(paid)}.</p>}
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-900">Months</p>
          <div className="grid grid-cols-6 gap-1.5">
            {MONTH_CHOICES.map(m => (
              <button key={m} type="button" onClick={() => setMonths(m)} aria-pressed={months === m}
                className={`h-10 rounded-lg text-sm font-bold transition ${months === m ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"}`}>{m}</button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="inst-first" className="mb-1.5 block text-xs font-semibold text-slate-900">First installment due</label>
          <input id="inst-first" type="date" value={first} onChange={e => setFirst(e.target.value)} className={field} />
        </div>
        {preview.length > 0 && (
          <div className="rounded-xl bg-indigo-50 p-3 ring-1 ring-inset ring-indigo-200">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">Monthly installment</p>
            <p className="text-xl font-extrabold tabular-nums text-indigo-900">{pkr(preview[0].amount)}</p>
            <p className="mt-0.5 text-[11px] text-indigo-700">
              {months} months · {day(preview[0].dueDate)} to {day(preview[preview.length - 1].dueDate)} · {pkr(price - downNum)} on installments
            </p>
          </div>
        )}
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Dialog.Close asChild><button type="button" disabled={busy} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50">Cancel</button></Dialog.Close>
          <button type="submit" disabled={busy || !valid} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{busy ? "Saving…" : "Start plan"}</button>
        </div>
      </form>
    </Shell>
  );
}

/** The schedule: mark each installment received (or undo), print it, or drop a plan nothing was paid on. */
export function InstallmentScheduleDialog({ open, onOpenChange, saleId, plan, buyer, canManage, onAction }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  saleId: string;
  plan: InstallmentPlan | null;
  buyer: string;
  canManage: boolean;
  onAction: (body: { action: "payInstallment" | "unpayInstallment" | "removeInstallments"; index?: number }) => Promise<string | null>;
}) {
  const [busy, setBusy] = useState<number | "remove" | null>(null);
  const [error, setError] = useState("");
  const [now] = useState(() => Date.now());
  if (!plan) return null;
  const sum = installmentSummary(plan, now)!;

  async function run(body: Parameters<typeof onAction>[0], key: number | "remove") {
    setBusy(key);
    setError("");
    const err = await onAction(body);
    setBusy(null);
    if (err) setError(err);
  }

  return (
    <Shell open={open} onOpenChange={onOpenChange} busy={busy !== null} title="Installments"
      description={<>{buyer} · {sum.paidCount}/{sum.total} paid · {pkr(sum.left)} left{plan.downPayment ? ` · down ${pkr(plan.downPayment)}` : ""}</>}>
      {sum.overdueCount > 0 && (
        <p className="mt-4 flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
          <AlertTriangle size={14} /> {sum.overdueCount} overdue · {pkr(sum.overdueAmount)}
        </p>
      )}
      <ol className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl ring-1 ring-slate-200">
        {plan.items.map((it, i) => {
          const late = !it.paidAt && new Date(it.dueDate).getTime() < now;
          return (
            <li key={i} className={`flex items-center gap-3 px-3 py-2.5 ${late ? "bg-rose-50/60" : ""}`}>
              <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${it.paidAt ? "bg-emerald-100 text-emerald-700" : late ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"}`}>
                {it.paidAt ? <Check size={13} /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold tabular-nums text-slate-900">{pkr(it.amount)}</p>
                <p className={`text-[11px] ${late ? "font-semibold text-rose-600" : "text-slate-500"}`}>
                  Due {day(it.dueDate)}{it.paidAt ? ` · received ${day(it.paidAt)}` : late ? " · overdue" : ""}
                </p>
              </div>
              {canManage && (it.paidAt ? (
                <button type="button" onClick={() => run({ action: "unpayInstallment", index: i }, i)} disabled={busy !== null} aria-label="Undo"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><Undo2 size={12} /> Undo</button>
              ) : (
                <button type="button" onClick={() => run({ action: "payInstallment", index: i }, i)} disabled={busy !== null}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{busy === i ? "Saving…" : "Received"}</button>
              ))}
            </li>
          );
        })}
      </ol>
      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Link href={`/business/sales/${saleId}/installments`} target="_blank" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50">
          <Printer size={13} /> Print schedule
        </Link>
        {canManage && sum.paidCount === 0 && (
          <button type="button" onClick={() => run({ action: "removeInstallments" }, "remove")} disabled={busy !== null}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50">{busy === "remove" ? "Removing…" : "Remove plan"}</button>
        )}
      </div>
    </Shell>
  );
}

/** One line for cards: "Qist 3/12 · next PKR 50,000 on 5 Nov", red when overdue. */
export function InstallmentLine({ plan, onClick }: { plan?: InstallmentPlan | null; onClick?: () => void }) {
  const sum = installmentSummary(plan);
  if (!sum) return null;
  const text = sum.done ? `Installments complete · ${sum.total}/${sum.total}`
    : sum.overdueCount ? `${sum.overdueCount} installment${sum.overdueCount !== 1 ? "s" : ""} overdue · ${pkr(sum.overdueAmount)}`
    : `Qist ${sum.paidCount}/${sum.total} · next ${pkr(sum.next!.amount)} on ${day(sum.next!.dueDate)}`;
  const cls = `inline-flex items-center gap-1 text-[11px] font-semibold ${sum.done ? "text-emerald-700" : sum.overdueCount ? "text-rose-600" : "text-indigo-700"}`;
  return onClick
    ? <button type="button" onClick={onClick} className={`${cls} hover:underline`}><CalendarClock size={12} /> {text}</button>
    : <span className={cls}><CalendarClock size={12} /> {text}</span>;
}
