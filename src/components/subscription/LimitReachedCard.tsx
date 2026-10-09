"use client";

import Link from "next/link";
import { ArrowRight, Crown, Lock } from "lucide-react";
import { formatLimit, planInfo } from "@/lib/plans";

const NOUNS = { listings: "active listings", staff: "team members", customers: "customers" } as const;

/** Shown in place of an "add" form once the plan's limit for `kind` is used up. */
export default function LimitReachedCard({
  kind,
  planId,
  used,
  limit,
  hint,
}: {
  kind: keyof typeof NOUNS;
  planId: string;
  used: number;
  limit: number | null;
  hint?: string;
}) {
  const plan = planInfo(planId);
  return (
    <div className="relative overflow-hidden rounded-[22px] bg-slate-950 p-6 text-white shadow-[0_30px_60px_-30px_rgba(15,23,42,0.6)] sm:p-8">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 left-10 h-56 w-56 rounded-full bg-indigo-500/25 blur-3xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 text-amber-300 ring-1 ring-inset ring-white/15">
            <Lock size={20} />
          </span>
          <div>
            <p className="text-lg font-bold tracking-tight">You&apos;ve reached your {plan.name} plan limit</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              {used.toLocaleString()} of {formatLimit(limit)} {NOUNS[kind]} used.{" "}
              {hint ?? "Upgrade to a premium plan to add more."}
            </p>
          </div>
        </div>
        <Link
          href="/pricing"
          className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/25 transition hover:opacity-90"
        >
          <Crown size={16} /> View plans <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
