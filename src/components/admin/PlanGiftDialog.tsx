"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Building2, Crown, Gift } from "lucide-react";
import { PLAN_LIST, PLAN_PERIOD_DAYS, formatLimit, planInfo, type PlanId } from "@/lib/plans";

export type PlanGiftTarget = {
  /** Shown in the title: a user's name/email, or a business name */
  name: string;
  /** Set when gifting to a business: the owner whose account actually receives the plan */
  ownerLabel?: string;
  effectivePlan: PlanId;
  planExpiresAt?: string | null;
};

const PAID_PLANS = PLAN_LIST.filter(p => p.id !== "FREE");

/** Gift lengths in 30-day periods; every plan ends, so there is no "no end date" */
const DURATIONS: { value: number; label: string }[] = [1, 3, 6, 12].map(n => ({ value: n, label: `${n * PLAN_PERIOD_DAYS} days` }));

export type PlanSourceChoice = "PAID" | "ADMIN_GRANT";

export const fmtPlanDate = (d: string) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

/**
 * Activates a plan for a user or (through its owner) a business: either paid (one 30-day period,
 * renewals add 30 days) or a free gift. Every plan ends, after which the account is on Free again.
 * Taking a gift back is a separate "Revoke" action, not an option here.
 */
export default function PlanGiftDialog({ target, onClose, onSave }: {
  target: PlanGiftTarget | null;
  onClose: () => void;
  onSave: (plan: PlanId, months: number, source: PlanSourceChoice) => Promise<void>;
}) {
  const [plan, setPlan] = useState<PlanId | null>(null);
  const [months, setMonths] = useState(1);
  const [source, setSource] = useState<PlanSourceChoice>("PAID");
  const [busy, setBusy] = useState(false);
  const selected = plan ?? (target && target.effectivePlan !== "FREE" ? target.effectivePlan : "STARTER");

  function reset() { setPlan(null); setMonths(1); setSource("PAID"); }

  async function save() {
    setBusy(true);
    await onSave(selected, source === "PAID" ? 1 : months, source);
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
                  <Crown size={20} />
                </span>
                <div className="min-w-0">
                  <Dialog.Title className="text-base font-semibold text-slate-900">Activate a plan for {target.name}</Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-slate-500">
                    Plans last {PLAN_PERIOD_DAYS} days at a time, then the account goes back to Free. Currently on <strong className="font-semibold text-slate-700">{planInfo(target.effectivePlan).name}</strong>
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

              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Payment</p>
              <div role="radiogroup" aria-label="Payment" className="mt-2 grid grid-cols-2 gap-2">
                {([["PAID", "Paid", `${PLAN_PERIOD_DAYS} days per payment`], ["ADMIN_GRANT", "Gift", "Free, you choose how long"]] as const).map(([v, label, hint]) => (
                  <button key={v} type="button" role="radio" aria-checked={source === v} onClick={() => setSource(v)}
                    className={`flex items-start gap-2.5 rounded-xl p-3 text-left ring-1 ring-inset transition ${source === v ? "bg-amber-50 ring-2 ring-amber-500" : "ring-slate-200 hover:bg-slate-50"}`}>
                    {v === "PAID" ? <Crown size={16} className="mt-0.5 flex-shrink-0 text-amber-600" /> : <Gift size={16} className="mt-0.5 flex-shrink-0 text-violet-600" />}
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">{label}</span>
                      <span className="block text-xs text-slate-500">{hint}</span>
                    </span>
                  </button>
                ))}
              </div>

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

              {source === "PAID" ? (
                <p className="mt-5 rounded-xl bg-slate-50 px-3.5 py-3 text-[13px] text-slate-600 ring-1 ring-inset ring-slate-200">
                  Runs for {PLAN_PERIOD_DAYS} days from today. If they already have this plan, the {PLAN_PERIOD_DAYS} days are added to the time left.
                  When it ends the account goes back to Free until they pay again.
                </p>
              ) : (
              <>
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
              </>
              )}

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
                  {busy ? "Saving…" : source === "PAID" ? `Activate ${planInfo(selected).name} · ${PLAN_PERIOD_DAYS} days` : `Gift ${planInfo(selected).name}`}
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
