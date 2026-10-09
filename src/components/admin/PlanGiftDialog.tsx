"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Building2, Gift } from "lucide-react";
import { PLAN_LIST, formatLimit, planInfo, type PlanId } from "@/lib/plans";

export type PlanGiftTarget = {
  /** Shown in the title: a user's name/email, or a business name */
  name: string;
  /** Set when gifting to a business: the owner whose account actually receives the plan */
  ownerLabel?: string;
  effectivePlan: PlanId;
  planExpiresAt?: string | null;
};

const PAID_PLANS = PLAN_LIST.filter(p => p.id !== "FREE");

const DURATIONS: { value: number | null; label: string }[] = [
  { value: 1, label: "1 month" },
  { value: 3, label: "3 months" },
  { value: 6, label: "6 months" },
  { value: 12, label: "1 year" },
  { value: null, label: "No end date" },
];

export const fmtPlanDate = (d: string) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

/**
 * Gifts a paid plan for free, to a user or (through its owner) a business.
 * Taking a plan back is a separate "Revoke" action, not an option here.
 */
export default function PlanGiftDialog({ target, onClose, onSave }: {
  target: PlanGiftTarget | null;
  onClose: () => void;
  onSave: (plan: PlanId, months: number | null) => Promise<void>;
}) {
  const [plan, setPlan] = useState<PlanId | null>(null);
  const [months, setMonths] = useState<number | null>(1);
  const [busy, setBusy] = useState(false);
  const selected = plan ?? (target && target.effectivePlan !== "FREE" ? target.effectivePlan : "STARTER");

  function reset() { setPlan(null); setMonths(1); }

  async function save() {
    setBusy(true);
    await onSave(selected, months);
    setBusy(false);
    reset();
  }

  return (
    <Dialog.Root open={target !== null} onOpenChange={o => { if (!o && !busy) { reset(); onClose(); } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-slate-950/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] max-h-[calc(100vh-32px)] w-[calc(100%-32px)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/20 focus:outline-none">
          {target && (
            <>
              <div className="flex gap-4">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950">
                  <Gift size={20} />
                </span>
                <div className="min-w-0">
                  <Dialog.Title className="text-base font-semibold text-slate-900">Gift a plan to {target.name}</Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-slate-500">
                    Free of charge. Currently on <strong className="font-semibold text-slate-700">{planInfo(target.effectivePlan).name}</strong>
                    {target.planExpiresAt && target.effectivePlan !== "FREE" ? ` until ${fmtPlanDate(target.planExpiresAt)}` : ""}.
                  </Dialog.Description>
                </div>
              </div>

              {target.ownerLabel && (
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-sky-50 px-3.5 py-3 text-[13px] text-sky-800 ring-1 ring-inset ring-sky-200">
                  <Building2 size={15} className="mt-0.5 flex-shrink-0" />
                  <span>
                    A business uses its owner&apos;s plan, so this goes to <strong className="font-semibold">{target.ownerLabel}</strong> and the whole team shares it.
                  </span>
                </p>
              )}

              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Plan</p>
              <div role="radiogroup" aria-label="Plan" className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {PAID_PLANS.map(p => {
                  const active = selected === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setPlan(p.id)}
                      className={`rounded-xl p-3 text-left ring-1 ring-inset transition ${active ? "bg-amber-50 ring-2 ring-amber-500" : "ring-slate-200 hover:bg-slate-50"}`}
                    >
                      <span className="block text-sm font-semibold" style={{ color: p.accent }}>{p.name}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {formatLimit(p.limits.listings)} listings · PKR {p.price.toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Duration</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DURATIONS.map(d => (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => setMonths(d.value)}
                    aria-pressed={months === d.value}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
                      months === d.value ? "bg-slate-900 text-white ring-slate-900" : "text-slate-600 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Dialog.Close asChild>
                  <button type="button" disabled={busy} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50">
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="button"
                  onClick={save}
                  disabled={busy}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "Saving…" : `Gift ${planInfo(selected).name}`}
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
