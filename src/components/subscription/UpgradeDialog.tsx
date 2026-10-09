"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Clock3, Crown, ShieldCheck, X } from "lucide-react";
import { formatLimit, formatPlanPrice, type Plan } from "@/lib/plans";

/**
 * Shown when someone picks a paid plan. Online payment is not wired up yet,
 * so this explains that and points them to the team, who can activate the plan.
 */
export default function UpgradeDialog({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  return (
    <Dialog.Root open={plan !== null} onOpenChange={o => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-slate-950/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] w-[calc(100%-32px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-950/30 focus:outline-none">
          {plan && (
            <>
              <div className="relative overflow-hidden bg-slate-950 px-6 pb-6 pt-7 text-white">
                <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-amber-400/25 blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-indigo-500/30 blur-3xl" />
                <Dialog.Close aria-label="Close" className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white">
                  <X size={16} />
                </Dialog.Close>
                <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/30">
                  <Crown size={20} strokeWidth={2.25} />
                </span>
                <Dialog.Title className="relative mt-4 text-xl font-bold tracking-tight">Upgrade to {plan.name}</Dialog.Title>
                <p className="relative mt-1 text-sm text-slate-400">
                  <span className="font-semibold text-white">{formatPlanPrice(plan.price)}</span> / month · {formatLimit(plan.limits.listings)} listings
                </p>
              </div>

              <div className="space-y-4 px-6 py-6">
                <div className="flex gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-200">
                  <Clock3 size={18} className="mt-0.5 flex-shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Online payments are coming soon</p>
                    <Dialog.Description className="mt-1 text-[13px] leading-relaxed text-amber-800">
                      We&apos;re still setting up card and mobile wallet payments. Until then, contact the AutoMarket team and an admin
                      can activate {plan.name} on your account.
                    </Dialog.Description>
                  </div>
                </div>
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck size={14} className="text-emerald-600" /> You won&apos;t be charged anything today.
                </p>
                <Dialog.Close className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Got it
                </Dialog.Close>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
