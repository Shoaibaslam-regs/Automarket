"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, CheckCircle2, Undo2, X } from "lucide-react";
import { LATE_GRACE_MINUTES, LATE_RULE_TEXT, lateCharge } from "@/lib/bookings";
import { fmtDateTime, toDateTimeInput } from "./HandoverDialog";

const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString()}`;

function lateText(minutes: number): string {
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  return [d && `${d}d`, h && `${h}h`, (m || (!d && !h)) && `${m}m`].filter(Boolean).join(" ");
}

/**
 * "Mark returned": records when the vehicle came back and shows the late fee before saving.
 * Up to LATE_GRACE_MINUTES late is free; each later day costs one more day of rent.
 */
export default function ReturnDialog({ open, onOpenChange, vehicle, customer, dueBackAt, dailyRate, onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: string;
  customer: string;
  /** Return time given at handover; older bookings have none and are never charged */
  dueBackAt?: string;
  dailyRate: number;
  onSave: (returnedAt: string) => Promise<string | null>;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openedFor, setOpenedFor] = useState<string | null>(null);

  // Each time it opens, start from "now"
  const key = open ? `${vehicle}|${dueBackAt ?? ""}` : null;
  if (key !== openedFor) {
    setOpenedFor(key);
    setValue(toDateTimeInput(new Date()));
    setError("");
  }

  const back = value ? new Date(value) : null;
  const valid = !!back && !isNaN(back.getTime());
  const late = valid ? lateCharge(dueBackAt, back!, dailyRate) : null;
  const inGrace = !!late && late.lateMinutes > 0 && late.lateDays === 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) { setError("Enter when the vehicle came back"); return; }
    setSaving(true);
    setError("");
    const err = await onSave(back!.toISOString());
    setSaving(false);
    if (err) setError(err);
  }

  return (
    <Dialog.Root open={open} onOpenChange={o => !saving && onOpenChange(o)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-slate-950/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] max-h-[calc(100vh-32px)] w-[calc(100%-32px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"><Undo2 size={18} /></span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-base font-semibold text-slate-900">Mark returned</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">{customer} is bringing back the {vehicle}.</Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></Dialog.Close>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm ring-1 ring-inset ring-slate-200/70">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Return by</span>
              <span className="font-bold text-slate-900">{dueBackAt ? fmtDateTime(dueBackAt) : "Not set"}</span>
            </div>

            <div>
              <label htmlFor="returned-at" className="mb-1.5 block text-xs font-semibold text-slate-900">Came back at</label>
              <input id="returned-at" type="datetime-local" value={value} onChange={e => setValue(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10" />
            </div>

            {!dueBackAt ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 ring-1 ring-inset ring-slate-200">
                No return time was set at handover, so there is no late fee for this booking.
              </p>
            ) : late && late.lateDays > 0 ? (
              <div className="rounded-xl bg-rose-50 p-3 ring-1 ring-inset ring-rose-200">
                <p className="flex items-center gap-1.5 text-sm font-bold text-rose-700"><AlertTriangle size={15} /> {lateText(late.lateMinutes)} late</p>
                <div className="mt-2 flex items-baseline justify-between text-sm text-rose-800">
                  <span>{late.lateDays} extra day{late.lateDays !== 1 ? "s" : ""} × {pkr(dailyRate)}</span>
                  <span className="text-base font-extrabold tabular-nums">{pkr(late.fee)}</span>
                </div>
                <p className="mt-1.5 text-[11px] text-rose-700/80">{LATE_RULE_TEXT} The fee is added to the booking and printed on the slip.</p>
              </div>
            ) : (
              <p className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <CheckCircle2 size={14} />
                {inGrace ? `${lateText(late!.lateMinutes)} late, within the free ${LATE_GRACE_MINUTES / 60} hour. No late fee.` : "On time. No late fee."}
              </p>
            )}

            {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>}
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Dialog.Close asChild>
                <button type="button" disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              </Dialog.Close>
              <button type="submit" disabled={saving || !valid} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? "Saving…" : late && late.fee > 0 ? `Mark returned · ${pkr(late.fee)} late fee` : "Mark returned"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
