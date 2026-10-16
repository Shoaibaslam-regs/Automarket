"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Clock3, IdCard, KeyRound, Pencil, X } from "lucide-react";
import { formatCnicInput, normalizeCnic, normalizePlate } from "@/lib/plates";
import { LATE_RULE_TEXT } from "@/lib/bookings";
import type { Check } from "@/lib/checklist";
import ConditionFields, { EMPTY_CHECK, checkBody, type CheckForm } from "./ConditionFields";

/** A Date as the value of a datetime-local input, in the viewer's own time zone. */
export function toDateTimeInput(d: Date | string): string {
  const x = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
}

/** "Thu 15 Oct, 4:30 pm" */
export function fmtDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("en-PK", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
}

/** A number plate styled like a Pakistani registration plate. */
export function PlateBadge({ plate, className = "" }: { plate: string; className?: string }) {
  return (
    <span className={`theme-static inline-flex items-center rounded-md border-2 border-slate-900 bg-white px-2 py-0.5 font-mono text-xs font-black tracking-[0.12em] text-slate-900 ${className}`}>
      {plate}
    </span>
  );
}

/**
 * The handover details on a booking card: number plate and renter CNIC side by side, with an Edit button
 * for the owner. Shows an "Add" button instead when nothing is recorded yet and `onEdit` is given.
 */
export function HandoverDetails({ plate, cnic, onEdit, addLabel = "Add plate & CNIC" }: {
  plate?: string;
  cnic?: string;
  onEdit?: () => void;
  addLabel?: string;
}) {
  if (!plate && !cnic) {
    return onEdit ? (
      <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-slate-900 hover:text-slate-900">
        <KeyRound size={12} /> {addLabel}
      </button>
    ) : null;
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-inset ring-slate-200/70">
      {plate && (
        <span className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Plate</span>
          <PlateBadge plate={plate} />
        </span>
      )}
      {cnic && (
        <span className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">CNIC</span>
          <span className="inline-flex items-center gap-1 font-mono text-xs font-bold tracking-wide text-slate-900"><IdCard size={13} className="text-slate-400" /> {cnic}</span>
        </span>
      )}
      {onEdit && (
        <button type="button" onClick={onEdit} className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 transition hover:text-slate-900">
          <Pencil size={11} /> Edit
        </button>
      )}
    </div>
  );
}

/**
 * Asks for the vehicle's number plate and the renter's CNIC at handover (or corrects them later).
 * `onSave` returns an error message, or null when it worked.
 */
export default function HandoverDialog({ open, onOpenChange, title, description, confirmLabel, initialPlate, initialCnic, askReturnTime, initialDueBackAt, askCondition, onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  initialPlate?: string;
  initialCnic?: string;
  /** Also ask for the exact time the renter must bring the vehicle back */
  askReturnTime?: boolean;
  initialDueBackAt?: string;
  /** Also record the condition as it goes out (odometer, fuel, notes, photos) */
  askCondition?: boolean;
  onSave: (details: { plateNumber: string; cnic: string; dueBackAt?: string; checkOut?: Check }) => Promise<string | null>;
}) {
  const [plateValue, setPlateValue] = useState("");
  const [cnicValue, setCnicValue] = useState("");
  const [dueValue, setDueValue] = useState("");
  const [cond, setCond] = useState<CheckForm>(EMPTY_CHECK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openedWith, setOpenedWith] = useState<string | null>(null);

  // Reset the fields each time the dialog opens, prefilled with what's already known
  const key = open ? `${initialPlate ?? ""}|${initialCnic ?? ""}|${initialDueBackAt ?? ""}` : null;
  if (key !== openedWith) {
    setOpenedWith(key);
    setPlateValue(initialPlate ?? "");
    setCnicValue(initialCnic ? formatCnicInput(initialCnic) : "");
    setDueValue(initialDueBackAt ? toDateTimeInput(initialDueBackAt) : "");
    setCond(EMPTY_CHECK);
    setError("");
  }

  const plate = normalizePlate(plateValue);
  const cnic = normalizeCnic(cnicValue);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!plate) { setError("Enter the number plate, e.g. LEA-1234"); return; }
    if (!cnic) { setError("Enter the renter's 13-digit CNIC, e.g. 35202-1234567-1"); return; }
    const due = dueValue ? new Date(dueValue) : null;
    if (askReturnTime && (!due || isNaN(due.getTime()))) { setError("Set the exact date and time the vehicle must come back"); return; }
    setSaving(true);
    setError("");
    const err = await onSave({ plateNumber: plate, cnic, ...(askReturnTime && due ? { dueBackAt: due.toISOString() } : {}), ...(askCondition ? { checkOut: checkBody(cond) } : {}) });
    setSaving(false);
    if (err) setError(err);
  }

  const field = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-base font-bold tracking-[0.1em] text-slate-900 outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";

  return (
    <Dialog.Root open={open} onOpenChange={o => !saving && onOpenChange(o)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-slate-950/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] max-h-[calc(100vh-32px)] w-[calc(100%-32px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"><KeyRound size={18} /></span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-base font-semibold text-slate-900">{title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">{description}</Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></Dialog.Close>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="handover-plate" className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-900">
                Vehicle number plate
                {plate && <PlateBadge plate={plate} className="text-[10px]" />}
              </label>
              <input id="handover-plate" autoFocus value={plateValue} onChange={e => setPlateValue(e.target.value.toUpperCase())}
                maxLength={20} placeholder="LEA-1234" autoComplete="off" spellCheck={false} className={`${field} uppercase`} />
            </div>
            <div>
              <label htmlFor="handover-cnic" className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-900">
                Renter&apos;s CNIC
                <span className={`text-[11px] font-medium ${cnic ? "text-emerald-600" : "text-slate-400"}`}>{cnic ? "Looks right" : "13 digits"}</span>
              </label>
              <input id="handover-cnic" inputMode="numeric" value={cnicValue} onChange={e => setCnicValue(formatCnicInput(e.target.value))}
                placeholder="35202-1234567-1" autoComplete="off" className={field} />
              <p className="mt-1.5 text-[11px] text-slate-400">Check it against the renter&apos;s original CNIC card.</p>
            </div>
            {askReturnTime && (
              <div>
                <label htmlFor="handover-due" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                  <Clock3 size={13} /> Return by (exact time)
                </label>
                <input id="handover-due" type="datetime-local" value={dueValue} onChange={e => setDueValue(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10" />
                <p className="mt-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800 ring-1 ring-inset ring-amber-200">
                  Tell the renter this time. {LATE_RULE_TEXT}
                </p>
              </div>
            )}

            {askCondition && <ConditionFields value={cond} onChange={setCond} idPrefix="out" />}

            {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>}
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Dialog.Close asChild>
                <button type="button" disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              </Dialog.Close>
              <button type="submit" disabled={saving || !plate || !cnic} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? "Saving…" : confirmLabel}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
