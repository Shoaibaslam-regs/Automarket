"use client";

import Link from "next/link";
import { Car, Check, Crown, Gem, Rocket, Sparkles, UserRound, Users, type LucideIcon } from "lucide-react";
import { PLAN_LIST, formatLimit, type Plan, type PlanId } from "@/lib/plans";

const PLAN_ICONS: Record<PlanId, LucideIcon> = { FREE: Sparkles, STARTER: Rocket, PRO: Gem, UNLIMITED: Crown };

/** Plan order, used to tell upgrades from downgrades */
const RANK: Record<PlanId, number> = { FREE: 0, STARTER: 1, PRO: 2, UNLIMITED: 3 };

export default function PlanCards({
  currentPlanId,
  signedIn,
  onUpgrade,
}: {
  /** null while unknown or signed out */
  currentPlanId: PlanId | null;
  signedIn: boolean;
  onUpgrade: (plan: Plan) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {PLAN_LIST.map(plan => {
        const Icon = PLAN_ICONS[plan.id];
        const current = currentPlanId === plan.id;
        const dark = plan.highlight;
        const premium = plan.id === "UNLIMITED";
        const lower = currentPlanId !== null && RANK[plan.id] < RANK[currentPlanId];

        return (
          <div
            key={plan.id}
            className={`relative flex flex-col rounded-[26px] p-[1.5px] transition duration-300 hover:-translate-y-1 ${
              dark
                ? "bg-gradient-to-b from-indigo-400 via-violet-500 to-fuchsia-500 shadow-[0_30px_60px_-25px_rgba(99,102,241,0.6)]"
                : premium
                ? "bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 shadow-[0_30px_60px_-28px_rgba(217,119,6,0.55)]"
                : "bg-slate-200/80 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.35)]"
            }`}
          >
            {(dark || premium) && (
              <span
                className={`absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] shadow-lg ${
                  dark ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white shadow-indigo-500/30" : "bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 shadow-amber-500/30"
                }`}
              >
                {dark ? "Most popular" : "Best value"}
              </span>
            )}

            <div className={`flex h-full flex-col rounded-[24.5px] p-6 ${dark ? "bg-slate-950 text-white" : "bg-white text-slate-900"}`}>
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                    dark
                      ? "bg-white/10 text-indigo-200 ring-1 ring-inset ring-white/15"
                      : premium
                      ? "bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <Icon size={20} strokeWidth={2} />
                </span>
                {current && (
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${dark ? "bg-emerald-400/15 text-emerald-300" : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"}`}>
                    Your plan
                  </span>
                )}
              </div>

              <h3 className="mt-5 text-lg font-bold tracking-tight">{plan.name}</h3>
              <p className={`mt-1 min-h-[40px] text-[13px] leading-snug ${dark ? "text-slate-400" : "text-slate-500"}`}>{plan.tagline}</p>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className={`text-sm font-semibold ${dark ? "text-slate-400" : "text-slate-500"}`}>PKR</span>
                <span className="text-4xl font-extrabold tracking-tight tabular-nums">{plan.price.toLocaleString()}</span>
                <span className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>{plan.price === 0 ? "forever" : "/ month"}</span>
              </div>

              {/* Limits */}
              <div className={`mt-5 grid grid-cols-3 gap-2 rounded-2xl p-3 ${dark ? "bg-white/5 ring-1 ring-inset ring-white/10" : "bg-slate-50 ring-1 ring-inset ring-slate-200/70"}`}>
                {([
                  ["listings", "Listings", Car],
                  ["staff", "Team", Users],
                  ["customers", "Customers", UserRound],
                ] as const).map(([key, label, LimitIcon]) => (
                  <div key={key} className="min-w-0 text-center">
                    <LimitIcon size={14} className={`mx-auto ${dark ? "text-indigo-300" : premium ? "text-amber-600" : "text-slate-400"}`} />
                    <p className="mt-1 truncate text-sm font-bold tabular-nums">{plan.limits[key] === null ? "∞" : formatLimit(plan.limits[key])}</p>
                    <p className={`truncate text-[10px] ${dark ? "text-slate-500" : "text-slate-400"}`}>{label}</p>
                  </div>
                ))}
              </div>

              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map(f => (
                  <li key={f} className={`flex items-start gap-2.5 text-[13px] ${dark ? "text-slate-300" : "text-slate-600"}`}>
                    <span
                      className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${
                        dark ? "bg-indigo-400/20 text-indigo-300" : premium ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      <Check size={10} strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {current ? (
                  <button disabled className={`w-full cursor-default rounded-xl px-4 py-3 text-sm font-semibold ${dark ? "bg-white/10 text-slate-300" : "bg-slate-100 text-slate-500"}`}>
                    Current plan
                  </button>
                ) : plan.price === 0 ? (
                  signedIn ? (
                    <button disabled className="w-full cursor-default rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-400 ring-1 ring-inset ring-slate-200">
                      Included with every account
                    </button>
                  ) : (
                    <Link href="/register" className="block w-full rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50">
                      Start for free
                    </Link>
                  )
                ) : !signedIn ? (
                  <Link
                    href="/login"
                    className={`block w-full rounded-xl px-4 py-3 text-center text-sm font-semibold transition ${
                      dark ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white hover:opacity-90" : premium ? "bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 hover:opacity-90" : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    Sign in to upgrade
                  </Link>
                ) : (
                  <button
                    onClick={() => onUpgrade(plan)}
                    className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      dark
                        ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/25 hover:opacity-90"
                        : premium
                        ? "bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 hover:opacity-90"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    {lower ? `Switch to ${plan.name}` : `Upgrade to ${plan.name}`}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
