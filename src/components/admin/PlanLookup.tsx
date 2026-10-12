"use client";

import { useEffect, useState } from "react";
import { Building2, Crown, Gift, Hourglass, Search, Sparkles, Undo2 } from "lucide-react";
import { Badge, ConfirmDialog, Panel, btn } from "@/components/admin/ui";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import PlanGiftDialog, { fmtPlanDate } from "@/components/admin/PlanGiftDialog";
import { PLAN_LIST, TRIAL_MONTHS, isFreeGrant, planInfo, planSourceLabel, type PlanId } from "@/lib/plans";

type Result = {
  id: string;
  name: string;
  email: string;
  role: string;
  business: { name: string; slug: string; isOwner: boolean } | null;
  plan: PlanId;
  expiresAt: string | null;
  source: string | null;
  trialUsedAt: string | null;
  trialPlan: string | null;
};

const PAID = PLAN_LIST.filter(p => p.id !== "FREE");

/**
 * Admin dashboard box: look up anyone's plan by name, email, ID or business name,
 * then gift a plan, start their one-time free trial, or revoke a free plan.
 */
export default function PlanLookup() {
  const { canWrite } = useAdminAccess();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [giftFor, setGiftFor] = useState<Result | null>(null);
  const [trialFor, setTrialFor] = useState<Result | null>(null);
  const [trialPlan, setTrialPlan] = useState<PlanId>("STARTER");
  const [revokeFor, setRevokeFor] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  // Search as the admin types, after a short pause
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const t = setTimeout(() => {
      setSearching(true);
      fetch(`/api/admin/plans/lookup?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(d => { setResults(d.results || []); setSearched(q); })
        .catch(() => setNotice({ ok: false, text: "Search failed. Please try again." }))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, reload]);

  async function send(url: string, init: RequestInit, success: string) {
    setBusy(true);
    setNotice(null);
    const res = await fetch(url, init);
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setNotice(res.ok ? { ok: true, text: success } : { ok: false, text: data.error || "Something went wrong" });
    setReload(n => n + 1);
    return res.ok;
  }

  const json = (method: string, body: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const who = (r: Result) => (r.business?.isOwner ? `${r.business.name} (${r.name})` : r.name);
  const shown = query.trim().length >= 2 ? results : [];

  return (
    <Panel
      title="Plan lookup"
      description="Search a user or business to check their plan and free-trial status"
      className="mb-4 lg:mb-6"
    >
      <div className="p-4 sm:p-5">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Name, email, business name or ID (#a1b2c3)…"
            aria-label="Search users and businesses"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
          />
          {searching && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">Searching…</span>}
        </div>

        {notice && (
          <div role={notice.ok ? "status" : "alert"} className={`mt-3 rounded-xl px-4 py-2.5 text-sm ring-1 ring-inset ${notice.ok ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"}`}>
            {notice.text}
          </div>
        )}

        {shown.length > 0 ? (
          <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl ring-1 ring-slate-200">
            {shown.map(r => {
              const plan = planInfo(r.plan);
              const free = r.plan === "FREE";
              const label = planSourceLabel(r.source);
              return (
                <li key={r.id} className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-slate-900">{r.name}</p>
                      <span className="font-mono text-[10px] text-slate-400">#{r.id.slice(-6)}</span>
                      {r.role === "ADMIN" && <Badge tone="violet">ADMIN</Badge>}
                    </div>
                    <p className="truncate text-xs text-slate-500">{r.email}</p>
                    {r.business && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                        <Building2 size={11} /> {r.business.isOwner ? "Owns" : "Works at"}{" "}
                        <a href={`/dealers/${r.business.slug}`} target="_blank" rel="noreferrer" className="font-medium text-indigo-700 hover:underline">{r.business.name}</a>
                        {!r.business.isOwner && <span className="text-slate-400"> · uses the owner&apos;s plan</span>}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 sm:w-[280px] sm:flex-shrink-0">
                    <div className="min-w-[110px]">
                      <p className="flex items-center gap-1 text-sm font-semibold" style={{ color: plan.accent }}>
                        {!free && <Crown size={12} />} {plan.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {free ? "No paid plan" : `${label ? `${label} · ` : ""}${r.expiresAt ? `until ${fmtPlanDate(r.expiresAt)}` : "no end date"}`}
                      </p>
                    </div>
                    <div>
                      {r.trialUsedAt ? (
                        <Badge tone="neutral"><Hourglass size={10} /> Trial used {fmtPlanDate(r.trialUsedAt)}</Badge>
                      ) : (
                        <Badge tone="green"><Sparkles size={10} /> Trial available</Badge>
                      )}
                    </div>
                  </div>

                  {canWrite && (!r.business || r.business.isOwner) && (
                    <div className="flex flex-wrap gap-1.5 sm:flex-shrink-0 sm:justify-end">
                      {!r.trialUsedAt && free && (
                        <button onClick={() => { setTrialPlan("STARTER"); setTrialFor(r); }} disabled={busy} className={`${btn.base} ${btn.warn}`}>
                          <Sparkles size={13} /> Free trial
                        </button>
                      )}
                      <button onClick={() => setGiftFor(r)} disabled={busy} className={`${btn.base} ${btn.secondary}`}>
                        <Gift size={13} /> Gift
                      </button>
                      {!free && isFreeGrant(r.source) && (
                        <button onClick={() => setRevokeFor(r)} disabled={busy} aria-label="Revoke plan" title="Revoke plan" className={`${btn.base} ${btn.danger}`}>
                          <Undo2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : query.trim().length >= 2 && !searching && searched === query.trim() ? (
          <p className="mt-3 text-center text-sm text-slate-400">No users or businesses match “{searched}”.</p>
        ) : (
          <p className="mt-3 text-xs text-slate-400">
            Each account gets one {TRIAL_MONTHS}-month free trial. Business plans belong to the owner, so search the business or its owner.
          </p>
        )}
      </div>

      <PlanGiftDialog
        target={giftFor && {
          name: who(giftFor),
          ownerLabel: giftFor.business?.isOwner ? giftFor.name : undefined,
          effectivePlan: giftFor.plan,
          planExpiresAt: giftFor.expiresAt,
        }}
        onClose={() => setGiftFor(null)}
        onSave={async (plan, months) => {
          const r = giftFor;
          if (!r) return;
          await send(`/api/admin/users/${r.id}/plan`, json("PATCH", { plan, months }), `${who(r)} now has ${planInfo(plan).name} for free.`);
          setGiftFor(null);
        }}
      />

      <ConfirmDialog
        open={trialFor !== null}
        onOpenChange={o => !o && setTrialFor(null)}
        tone="warn"
        icon={Sparkles}
        title={`Start ${trialFor ? who(trialFor) : ""}'s free trial?`}
        loading={busy}
        loadingLabel="Starting…"
        confirmLabel={`Start ${planInfo(trialPlan).name} trial`}
        onConfirm={async () => {
          const r = trialFor;
          if (!r) return;
          await send(`/api/admin/users/${r.id}/plan`, json("PATCH", { plan: trialPlan, trial: true }), `${who(r)}'s ${TRIAL_MONTHS}-month ${planInfo(trialPlan).name} trial has started.`);
          setTrialFor(null);
        }}
        description={
          <>
            <span className="block">
              {TRIAL_MONTHS} month free, then it returns to Free automatically. <strong className="font-semibold text-slate-900">Each account gets one trial only</strong>. Once started it can&apos;t be given again, even if you revoke it.
            </span>
            <span className="mt-3 grid grid-cols-3 gap-1.5">
              {PAID.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setTrialPlan(p.id)}
                  aria-pressed={trialPlan === p.id}
                  className={`rounded-lg px-2 py-2 text-xs font-semibold ring-1 ring-inset ${trialPlan === p.id ? "bg-amber-50 text-amber-900 ring-2 ring-amber-500" : "text-slate-600 ring-slate-200 hover:bg-slate-50"}`}
                >
                  {p.name}
                </button>
              ))}
            </span>
          </>
        }
      />

      <ConfirmDialog
        open={revokeFor !== null}
        onOpenChange={o => !o && setRevokeFor(null)}
        tone="danger"
        icon={Undo2}
        title={`Revoke ${revokeFor ? planInfo(revokeFor.plan).name : ""} from ${revokeFor ? who(revokeFor) : ""}?`}
        loading={busy}
        loadingLabel="Revoking…"
        confirmLabel="Revoke plan"
        onConfirm={async () => {
          const r = revokeFor;
          if (!r) return;
          await send(`/api/admin/users/${r.id}/plan`, { method: "DELETE" }, `${who(r)} is back on Free.`);
          setRevokeFor(null);
        }}
        description={
          <>
            They go back to the Free plan straight away.
            {revokeFor?.source === "TRIAL" && " Their free trial stays used, so it can't be started again."}
          </>
        }
      />
    </Panel>
  );
}
