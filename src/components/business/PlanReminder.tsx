"use client";

import { useEffect, useState } from "react";
import { CircleAlert, Crown, X } from "lucide-react";
import UpgradeDialog from "@/components/subscription/UpgradeDialog";
import { useSubscription, type SubscriptionInfo } from "@/components/subscription/useSubscription";
import { PLANS, planInfo, type Plan } from "@/lib/plans";
import { planNotice, type PlanNotice } from "@/lib/businessPlan";

// The console's plan reminders (rules and wording in src/lib/businessPlan.ts):
// - PlanReminder (business layout): when the console opens, a card slides down from the top once per session for
//   each stage (a week before, the last three days, ended), with Renew now; and while the business is lapsed a slim
//   red bar stays at the top of every page, so the team knows why nothing new can be added.
// - PlanBanner (dashboard): the same reminder as a card above Today.
// Renew now opens the usual upgrade dialog (payment details and "Message the team") for the plan to renew, or
// Premium after the free month. Only the owner and managers get the buttons; the team still sees the lapsed bar.

const SEEN_KEY = "plan-reminder-seen";
const SHOW_MS = 10_000;

/** The reminder for this account, the plan Renew offers, and whether this person can renew. */
function reminderFor(sub: SubscriptionInfo | null): { notice: PlanNotice | null; plan: Plan; canRenew: boolean; key: string } | null {
  const b = sub?.business;
  if (!sub || !b) return null;
  const stored = planInfo(sub.storedPlanId);
  const notice = planNotice({ state: b.state, endsAt: b.endsAt, planName: stored.name, business: true });
  // One stage per week, the last three days and ended, so each shows once in a session
  const stage = b.state === "LAPSED" ? "ended" : b.daysLeft <= 3 ? "last" : "week";
  return {
    notice,
    plan: stored.id === "FREE" ? PLANS.STARTER : stored,
    canRenew: b.role === "OWNER" || b.role === "MANAGER",
    key: `${b.state}:${stage}:${b.endsAt}`,
  };
}

const TONE = {
  warn: { bar: "bg-amber-500", icon: "text-amber-600" },
  danger: { bar: "bg-rose-500", icon: "text-rose-600" },
};

export default function PlanReminder() {
  const { data: sub } = useSubscription();
  const r = reminderFor(sub);
  const [toast, setToast] = useState<"in" | "out" | null>(null);
  const [renewing, setRenewing] = useState<Plan | null>(null);

  // Slide the card down once per session for this stage
  useEffect(() => {
    if (!r?.notice || !r.canRenew) return;
    let seen = "";
    try { seen = sessionStorage.getItem(SEEN_KEY) ?? ""; } catch {}
    if (seen === r.key) return;
    try { sessionStorage.setItem(SEEN_KEY, r.key); } catch {}
    const show = setTimeout(() => setToast("in"), 600);
    const hide = setTimeout(() => setToast("out"), 600 + SHOW_MS);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [r?.notice, r?.canRenew, r?.key]);

  if (!r?.notice) return null;
  const { notice, plan, canRenew } = r;
  const lapsed = sub?.business?.state === "LAPSED";

  return (
    <>
      <style>{`
        @keyframes am-plan-in { from { transform: translate(-50%, calc(-100% - 24px)); opacity: 0 } to { transform: translate(-50%, 0); opacity: 1 } }
        @keyframes am-plan-out { from { transform: translate(-50%, 0); opacity: 1 } to { transform: translate(-50%, calc(-100% - 24px)); opacity: 0 } }
        @media (prefers-reduced-motion: reduce) { .am-plan-toast { animation-duration: 1ms !important } }
      `}</style>

      {/* While lapsed: a slim bar on every console page */}
      {lapsed && (
        <div role="status" className="theme-static flex flex-wrap items-center gap-x-3 gap-y-1 bg-rose-600 px-4 py-2 text-xs font-medium text-white sm:px-6">
          <CircleAlert size={14} className="flex-shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">{notice.title}. Nothing new can be added until you subscribe; everything else keeps working.</span>
          {canRenew && (
            <button type="button" onClick={() => setRenewing(plan)} className="rounded-md bg-white px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50">
              {notice.action}
            </button>
          )}
        </div>
      )}

      {/* The reminder that slides down from the top when the console opens */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="am-plan-toast fixed left-1/2 top-3 z-[1200] w-[min(460px,calc(100vw-24px))]"
          style={{ animation: `${toast === "in" ? "am-plan-in" : "am-plan-out"} 380ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards` }}
          onAnimationEnd={() => toast === "out" && setToast(null)}
        >
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/15">
            <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${TONE[notice.tone].bar}`} />
            <div className="flex gap-3 py-3.5 pl-5 pr-3">
              <Crown size={18} className={`mt-0.5 flex-shrink-0 ${TONE[notice.tone].icon}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">{notice.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{notice.body}</p>
                <button type="button" onClick={() => { setToast("out"); setRenewing(plan); }}
                  className="mt-2.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">
                  {notice.action}
                </button>
              </div>
              <button type="button" onClick={() => setToast("out")} aria-label="Dismiss" className="h-7 w-7 flex-shrink-0 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={15} className="mx-auto" />
              </button>
            </div>
          </div>
        </div>
      )}

      <UpgradeDialog plan={renewing} onClose={() => setRenewing(null)} />
    </>
  );
}

/** The dashboard's reminder card (a week before the end, and while lapsed), for the owner and managers. */
export function PlanBanner() {
  const { data: sub } = useSubscription();
  const r = reminderFor(sub);
  const [renewing, setRenewing] = useState<Plan | null>(null);
  if (!r?.notice || !r.canRenew) return null;
  const { notice, plan } = r;
  return (
    <>
      <div className="relative mb-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${TONE[notice.tone].bar}`} />
        <div className="flex flex-col gap-3 py-4 pl-5 pr-4 sm:flex-row sm:items-center sm:pl-6">
          <Crown size={20} className={`flex-shrink-0 ${TONE[notice.tone].icon}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">{notice.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{notice.body}</p>
          </div>
          <button type="button" onClick={() => setRenewing(plan)} className="flex-shrink-0 self-start rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:self-auto">
            {notice.action}
          </button>
        </div>
      </div>
      <UpgradeDialog plan={renewing} onClose={() => setRenewing(null)} />
    </>
  );
}
