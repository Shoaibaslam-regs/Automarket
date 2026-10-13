"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { KeyRound, X } from "lucide-react";
import { normalizePlate } from "@/lib/plates";

/** A number plate styled like a Pakistani registration plate. */
export function PlateBadge({ plate, className = "" }: { plate: string; className?: string }) {
  return (
    <span className={`theme-static inline-flex items-center rounded-md border-2 border-slate-900 bg-white px-2 py-0.5 font-mono text-xs font-black tracking-[0.12em] text-slate-900 ${className}`}>
      {plate}
    </span>
  );
}

/**
 * Asks for the number plate of the vehicle being handed over (or corrects it later).
 * `onSave` returns an error message, or null when it worked.
 */
export default function PlateDialog({ open, onOpenChange, title, description, confirmLabel, initial, onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  initial?: string;
  onSave: (plate: string) => Promise<string | null>;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openedWith, setOpenedWith] = useState<string | null>(null);

  // Reset the field each time the dialog opens, prefilled with the last plate used for this vehicle
  const key = open ? initial ?? "" : null;
  if (key !== openedWith) {
    setOpenedWith(key);
    setValue(initial ?? "");
    setError("");
  }

  const plate = normalizePlate(value);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!plate) { setError("Enter the number plate, e.g. LEA-1234"); return; }
    setSaving(true);
    setError("");
    const err = await onSave(plate);
    setSaving(false);
    if (err) setError(err);
  }

  return (
    <Dialog.Root open={open} onOpenChange={o => !saving && onOpenChange(o)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-slate-950/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"><KeyRound size={18} /></span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-base font-semibold text-slate-900">{title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">{description}</Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></Dialog.Close>
          </div>

          <form onSubmit={submit} className="mt-5">
            <label htmlFor="plate-input" className="mb-1.5 block text-xs font-semibold text-slate-900">Number plate</label>
            <input
              id="plate-input"
              autoFocus
              value={value}
              onChange={e => setValue(e.target.value.toUpperCase())}
              maxLength={20}
              placeholder="LEA-1234"
              autoComplete="off"
              spellCheck={false}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-center font-mono text-lg font-bold uppercase tracking-[0.14em] text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
            <div className="mt-3 flex h-8 items-center justify-center">
              {plate ? <PlateBadge plate={plate} className="text-sm" /> : <span className="text-xs text-slate-400">Shown on the booking and the printed slip</span>}
            </div>
            {error && <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Dialog.Close asChild>
                <button type="button" disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              </Dialog.Close>
              <button type="submit" disabled={saving || !plate} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? "Saving…" : confirmLabel}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
