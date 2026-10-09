"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { CalendarClock, Check, Gift, Headset, Minus, ShieldCheck, Sparkles } from "lucide-react";
import PlanCards from "@/components/subscription/PlanCards";
import UpgradeDialog from "@/components/subscription/UpgradeDialog";
import ContactTeam from "@/components/subscription/ContactTeam";
import UsageMeters from "@/components/subscription/UsageMeters";
import { useSubscription } from "@/components/subscription/useSubscription";
import { PLANS, PLAN_LIST, formatLimit, planInfo, type Plan } from "@/lib/plans";

const COMPARE_ROWS: { label: string; value: (p: Plan) => string | boolean }[] = [
  { label: "Active listings", value: p => formatLimit(p.limits.listings) },
  { label: "Team members (incl. owner)", value: p => formatLimit(p.limits.staff) },
  { label: "Customer leads", value: p => formatLimit(p.limits.customers) },
  { label: "AI-verified photos", value: () => true },
  { label: "Buyer messaging", value: () => true },
  { label: "Rental management", value: p => p.price > 0 },
  { label: "Sales reports", value: p => p.price > 0 },
  { label: "Priority support", value: p => p.price >= 1200 },
];

const FAQ = [
  {
    q: "What counts as an active listing?",
    a: "Listings that are active, pending or rented. When you mark a vehicle as sold or inactive, the slot frees up for a new one.",
  },
  {
    q: "What happens when I reach my limit?",
    a: "Your existing listings stay live, but you can't publish new ones until you upgrade or mark an older listing as sold.",
  },
  {
    q: "Does my team share one plan?",
    a: "Yes. Everyone in a business uses the owner's plan, and all of their listings count towards it.",
  },
  {
    q: "How do I pay?",
    a: "Online payments are coming soon. Until then, tap Message the team (or WhatsApp) and an admin will activate your plan and share payment details.",
  },
];

export default function PricingPage() {
  const { data: session, status } = useSession();
  const signedIn = !!session?.user;
  const { data: sub } = useSubscription(status === "authenticated");
  const [upgrading, setUpgrading] = useState<Plan | null>(null);

  const current = sub ? planInfo(sub.planId) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 pb-40 pt-16 text-center sm:pt-20">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-indigo-600/25 blur-[120px]" />
        <div aria-hidden className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-amber-500/15 blur-[100px]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />

        <div className="relative mx-auto max-w-[760px] px-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-indigo-200 ring-1 ring-inset ring-white/10">
            <Sparkles size={13} /> Plans &amp; pricing
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Sell more with{" "}
            <span className="bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">AutoMarket Premium</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[560px] text-base leading-relaxed text-slate-400">
            Start free with {PLANS.FREE.limits.listings} listings and a team of {PLANS.FREE.limits.staff}. Upgrade when you need more listings, a bigger team and full showroom management.
          </p>
        </div>
      </section>

      <div className="relative mx-auto -mt-28 max-w-[1240px] px-4 pb-16 sm:px-6">
        <PlanCards currentPlanId={sub?.planId ?? null} signedIn={signedIn} onUpgrade={setUpgrading} />

        {/* Current usage */}
        {sub && current && (
          <section className="mt-12 rounded-[26px] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/80 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Your usage</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  You&apos;re on <span style={{ color: current.accent }}>{current.name}</span>
                </h2>
                {sub.inheritedFromOwner && <p className="mt-1 text-sm text-slate-500">Shared with your business through the owner&apos;s plan.</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {sub.source === "ADMIN_GRANT" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">
                    <Gift size={13} /> Complimentary
                  </span>
                )}
                {sub.expiresAt && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                    <CalendarClock size={13} /> Renews or ends {new Date(sub.expiresAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-5">
              <UsageMeters sub={sub} />
            </div>
          </section>
        )}

        {/* Comparison */}
        <section className="mt-12">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">Compare plans</h2>
          <div className="mt-6 overflow-x-auto rounded-[22px] bg-white ring-1 ring-slate-200/80">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Feature</th>
                  {PLAN_LIST.map(p => (
                    <th key={p.id} className="px-4 py-4 text-center">
                      <span className="block text-sm font-bold" style={{ color: p.accent }}>{p.name}</span>
                      <span className="block text-xs font-medium text-slate-400">PKR {p.price.toLocaleString()}{p.price ? "/mo" : ""}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => (
                  <tr key={row.label} className={i % 2 ? "bg-slate-50/60" : ""}>
                    <td className="px-5 py-3.5 font-medium text-slate-700">{row.label}</td>
                    {PLAN_LIST.map(p => {
                      const v = row.value(p);
                      return (
                        <td key={p.id} className="px-4 py-3.5 text-center tabular-nums text-slate-700">
                          {v === true ? (
                            <Check size={16} strokeWidth={2.5} className="mx-auto text-emerald-500" aria-label="Included" />
                          ) : v === false ? (
                            <Minus size={16} className="mx-auto text-slate-300" aria-label="Not included" />
                          ) : (
                            <span className={v === "Unlimited" ? "font-semibold text-amber-600" : ""}>{v}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Talk to the team */}
        <section className="relative mt-12 overflow-hidden rounded-[26px] bg-slate-950 p-6 text-white sm:p-10">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="relative grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-inset ring-white/10">
                <Headset size={13} /> Talk to the team
              </span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Ready to upgrade?</h2>
              <p className="mt-2 max-w-[520px] text-sm leading-relaxed text-slate-400">
                Message us and an admin will activate your plan, usually the same day. Your request includes your account ID,
                so we know exactly who you are.
              </p>
            </div>
            <ContactTeam plan={current && current.id !== "FREE" ? current : PLANS.STARTER} tone="dark" />
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto mt-14 max-w-[820px]">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">Questions</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {FAQ.map(item => (
              <div key={item.q} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200/80">
                <p className="text-sm font-semibold text-slate-900">{item.q}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">{item.a}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck size={14} className="text-emerald-500" /> Prices in Pakistani Rupees. No card needed for the Free plan.
          </p>
        </section>
      </div>

      <UpgradeDialog plan={upgrading} onClose={() => setUpgrading(null)} />
    </div>
  );
}
