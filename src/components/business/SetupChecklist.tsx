"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Rocket, X } from "lucide-react";

type StepId = "logo" | "contact" | "vehicle" | "team" | "customer" | "firstDeal" | "official";
const STEPS: { id: StepId; label: string; hint: string; href: string }[] = [
  { id: "logo", label: "Add your business picture", hint: "Your logo or a shop photo", href: "/business/settings" },
  { id: "contact", label: "Add your phone and address", hint: "So customers can call and find you", href: "/business/settings" },
  { id: "vehicle", label: "Add your first vehicle", hint: "For sale or for rent", href: "/sell" },
  { id: "team", label: "Invite a team member", hint: "Manager, sales or staff", href: "/business/staff" },
  { id: "customer", label: "Add a customer", hint: "Keep track of people interested in your cars", href: "/business/customers?add=1" },
  { id: "firstDeal", label: "Make your first booking or sale", hint: "Use + New at the bottom right", href: "/business/bookings?new=booking" },
  { id: "official", label: "Follow AutoMarket Official", hint: "Get news and offers for businesses", href: "/business/updates" },
];

/**
 * "Get started" card on the dashboard for a new business: each first step ticks itself when it's done.
 * Shown to the owner and managers; hidden once everything is done or when they choose Hide (kept per browser).
 */
export default function SetupChecklist() {
  const [data, setData] = useState<{ orgId: string; steps: Record<StepId, boolean> } | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    fetch("/api/business/checklist")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d?.show) return;
        setData(d);
        let dismissed = false;
        try { dismissed = localStorage.getItem(`setup-checklist-hidden:${d.orgId}`) === "1"; } catch {}
        setHidden(dismissed);
      })
      .catch(() => {});
  }, []);

  if (!data || hidden) return null;
  const done = STEPS.filter(s => data.steps[s.id]).length;
  if (done === STEPS.length) return null;
  const pct = Math.round((done / STEPS.length) * 100);

  function hide() {
    try { localStorage.setItem(`setup-checklist-hidden:${data!.orgId}`, "1"); } catch {}
    setHidden(true);
  }

  return (
    <section className="mb-5 overflow-hidden rounded-xl border border-[var(--gh-e1e4e8)] bg-white">
      <div className="flex items-start gap-3 px-4 pt-4">
        <span className="flex flex-shrink-0 items-center justify-center text-indigo-600"><Rocket size={17} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-[var(--gh-0d1117)]">Get your business ready</h2>
          <p className="text-xs text-[var(--gh-57606a)]">{done} of {STEPS.length} done · each step ticks itself when you finish it</p>
        </div>
        <button onClick={hide} aria-label="Hide checklist" title="Hide" className="rounded-md p-1 text-[var(--gh-8c959f)] hover:bg-[var(--gh-f6f8fa)]"><X size={16} /></button>
      </div>
      <div className="mx-4 mt-3 h-2 overflow-hidden rounded-full bg-[var(--gh-f6f8fa)]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-3 divide-y divide-[var(--gh-f6f8fa)] border-t border-[var(--gh-f6f8fa)]">
        {STEPS.map(s => {
          const ok = data.steps[s.id];
          return (
            <li key={s.id}>
              <Link href={s.href} className={`flex items-center gap-3 px-4 py-2.5 transition hover:bg-[var(--gh-f6f8fa)] ${ok ? "opacity-60" : ""}`}>
                <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${ok ? "bg-[var(--gh-1a7f37)] text-white" : "border-2 border-[var(--gh-d0d7de)]"}`}>
                  {ok && <Check size={13} strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[13px] font-semibold ${ok ? "text-[var(--gh-57606a)] line-through" : "text-[var(--gh-0d1117)]"}`}>{s.label}</span>
                  {!ok && <span className="block text-[11px] text-[var(--gh-8c959f)]">{s.hint}</span>}
                </span>
                {!ok && <ChevronRight size={16} className="flex-shrink-0 text-[var(--gh-8c959f)]" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
