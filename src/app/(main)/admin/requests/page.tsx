"use client";

import { useEffect, useState } from "react";
import { refreshAdminCounts } from "@/lib/adminCounts";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { BadgeCheck, Crown, Hand, Inbox, MessageSquare, XCircle } from "lucide-react";
import { PageHeader, Panel, Segmented, UserCell, btn } from "@/components/admin/ui";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import PlanGiftDialog, { type PlanSourceChoice } from "@/components/admin/PlanGiftDialog";
import VerifyBadgeDialog, { type BadgeAction } from "@/components/admin/VerifyBadgeDialog";
import StatusText from "@/components/ui/StatusText";
import ExpiringList from "@/components/admin/ExpiringList";
import { PLANS, effectivePlanId, isPlanId, planInfo, type BadgeVerification, type PlanId, type PlanSource } from "@/lib/plans";

type Person = { _id: string; name?: string; email: string; plan?: PlanId; planExpiresAt?: string; planSource?: PlanSource } | null;
type TeamRequest = {
  _id: string;
  kind: "PLAN" | "BADGE";
  status: "WAITING" | "DONE" | "REFUSED";
  plan?: string;
  price: number;
  createdAt: string;
  takenAt?: string;
  handledAt?: string;
  outcome?: string;
  userId: Person;
  organizationId: { _id: string; name: string; slug?: string; verification?: BadgeVerification } | null;
  takenBy: { _id: string; name?: string; email: string } | null;
  handledBy: { name?: string; email: string } | null;
};
type Tab = "waiting" | "done" | "expiring";

const fmt = (d: string) => new Date(d).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const shortId = (id?: string) => (id ? `#${id.slice(-6)}` : "");
const who = (p?: { name?: string; email: string } | null) => p?.name || p?.email || "an admin";

/**
 * The team's to-do list for plan upgrade and Verified badge requests (like Ad requests). Activating uses the usual
 * plan and badge dialogs, which close the request wherever the change is made; Refuse tells the person in Messages.
 */
export default function AdminRequestsPage() {
  const { can } = useAdminAccess();
  const [tab, setTab] = useState<Tab>("waiting");
  const [data, setData] = useState<{ requests: TeamRequest[]; waiting: number } | null>(null);
  const [reload, setReload] = useState(0);
  const [planFor, setPlanFor] = useState<TeamRequest | null>(null);
  const [badgeFor, setBadgeFor] = useState<TeamRequest | null>(null);
  const [refuseFor, setRefuseFor] = useState<TeamRequest | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    // Expiring soon has its own list (ExpiringList)
    if (tab === "expiring") return;
    fetch(`/api/admin/requests?status=${tab}`)
      .then(r => r.json())
      .then(d => { setData({ requests: d.requests ?? [], waiting: d.waiting ?? 0 }); refreshAdminCounts({ requests: d.waiting ?? 0 }); })
      .catch(() => setData({ requests: [], waiting: 0 }));
  }, [tab, reload]);

  const canHandle = (r: TeamRequest) => can(r.kind === "PLAN" ? "plans" : "badges");

  async function call(url: string, body: unknown, success: string) {
    setError("");
    setNotice("");
    const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) { setError(d?.error ?? "Something went wrong. Please try again."); return false; }
    setNotice(success);
    setReload(n => n + 1);
    return true;
  }

  async function take(r: TeamRequest) {
    setBusy(r._id);
    await call(`/api/admin/requests/${r._id}`, { action: "take" }, "It's yours now. Other admins can see you're on it.");
    setBusy(null);
  }

  async function savePlan(plan: PlanId, months: number, source: PlanSourceChoice) {
    if (!planFor?.userId) return;
    await call(`/api/admin/users/${planFor.userId._id}/plan`, { plan, months, source }, `${planInfo(plan).name} is active for ${who(planFor.userId)}.`);
    setPlanFor(null);
  }

  async function saveBadge(body: BadgeAction) {
    if (!badgeFor?.organizationId) return;
    await call(`/api/admin/organizations/${badgeFor.organizationId._id}`, body,
      body.action === "verify" ? `${badgeFor.organizationId.name} is now Verified.` : `The badge request for ${badgeFor.organizationId.name} was refused.`);
    setBadgeFor(null);
  }

  async function refuse() {
    if (!refuseFor) return;
    setBusy(refuseFor._id);
    const ok = await call(`/api/admin/requests/${refuseFor._id}`, { action: "refuse", reason }, "Refused. They've been told in Messages.");
    setBusy(null);
    if (ok) setRefuseFor(null);
  }

  const planTarget = planFor?.userId && {
    name: planFor.organizationId?.name ?? who(planFor.userId),
    ownerLabel: planFor.organizationId ? who(planFor.userId) : undefined,
    effectivePlan: effectivePlanId(planFor.userId.plan, planFor.userId.planExpiresAt ? new Date(planFor.userId.planExpiresAt) : null),
    planExpiresAt: planFor.userId.planExpiresAt ?? null,
  };

  return (
    <div>
      <PageHeader title="Requests" description="Plan upgrades and Verified badge requests. Check the payment in Messages, then activate or refuse. Activating from Users or Businesses closes the request too. Expiring soon lists plans and badges ending this week, to follow up." />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Segmented<Tab> value={tab} onChange={setTab}
          options={[{ value: "waiting", label: `Waiting${data && tab === "waiting" ? ` (${data.waiting})` : ""}` }, { value: "done", label: "Done" }, { value: "expiring", label: "Expiring soon" }]} />
      </div>
      {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>}
      {notice && !error && <p role="status" className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">{notice}</p>}

      {tab === "expiring" ? <ExpiringList /> : (
      <Panel>
        {data === null ? (
          <div className="space-y-px">{[1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse bg-slate-50" />)}</div>
        ) : data.requests.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Inbox size={28} strokeWidth={1.5} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-900">{tab === "waiting" ? "No requests waiting" : "Nothing handled yet"}</p>
            <p className="mt-1 text-[13px] text-slate-500">When someone asks for a plan or the Verified badge, it shows up here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.requests.map(r => {
              const plan = r.plan && isPlanId(r.plan) ? PLANS[r.plan] : null;
              const handle = canHandle(r) && r.status === "WAITING";
              return (
                <li key={r._id} className="px-4 py-4 sm:px-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        {r.kind === "PLAN"
                          ? <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900"><Crown size={15} className="text-amber-500" /> {plan?.name ?? "Plan"} plan</span>
                          : <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900"><BadgeCheck size={15} className="text-sky-500" /> Verified badge</span>}
                        <span className="tabular-nums text-slate-500">PKR {r.price.toLocaleString()}/month</span>
                        {r.status === "DONE" && <StatusText className="text-emerald-600">Done</StatusText>}
                        {r.status === "REFUSED" && <StatusText className="text-rose-600">Refused</StatusText>}
                        <span className="text-xs text-slate-400">asked {fmt(r.createdAt)}</span>
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-6 gap-y-2">
                        {r.organizationId && (
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {r.organizationId.slug ? <Link href={`/dealers/${r.organizationId.slug}`} className="hover:underline">{r.organizationId.name}</Link> : r.organizationId.name}
                            </p>
                            <p className="text-xs text-slate-500">Business ID {shortId(r.organizationId._id)}</p>
                          </div>
                        )}
                        <UserCell name={r.userId?.name} email={r.userId?.email} size={30} meta={<span className="text-xs text-slate-400">{shortId(r.userId?._id)}</span>} />
                      </div>
                      {r.status === "WAITING" && r.takenBy && (
                        <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600"><Hand size={12} /> {who(r.takenBy)} is on it</p>
                      )}
                      {r.status !== "WAITING" && (
                        <p className="mt-2 text-xs text-slate-500">
                          {r.status === "DONE" ? "Done" : "Refused"} by {who(r.handledBy)}{r.handledAt ? ` · ${fmt(r.handledAt)}` : ""}{r.outcome ? ` · ${r.outcome}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 md:flex-shrink-0 md:justify-end">
                      {r.userId && (
                        <Link href={`/admin/support?with=${r.userId._id}`} className={`${btn.base} ${btn.secondary}`} title="Open the chat to check the payment receipt">
                          <MessageSquare size={13} /> Chat
                        </Link>
                      )}
                      {handle && !r.takenBy && (
                        <button type="button" onClick={() => take(r)} disabled={busy === r._id} className={`${btn.base} ${btn.secondary}`}><Hand size={13} /> Take</button>
                      )}
                      {handle && (
                        <>
                          <button type="button" onClick={() => (r.kind === "PLAN" ? setPlanFor(r) : setBadgeFor(r))}
                            className={`${btn.base} bg-slate-900 text-white hover:bg-slate-800`}>
                            {r.kind === "PLAN" ? <><Crown size={13} /> Activate plan</> : <><BadgeCheck size={13} /> Approve badge</>}
                          </button>
                          <button type="button" onClick={() => { setReason(""); setError(""); setRefuseFor(r); }} className={`${btn.base} ${btn.danger}`}><XCircle size={13} /> Refuse</button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      )}

      <PlanGiftDialog target={planTarget || null} onClose={() => setPlanFor(null)} onSave={savePlan} />
      <VerifyBadgeDialog
        target={badgeFor?.organizationId ? { name: badgeFor.organizationId.name, ownerLabel: who(badgeFor.userId), verification: badgeFor.organizationId.verification ?? null } : null}
        onClose={() => setBadgeFor(null)}
        onSave={saveBadge}
      />

      <Dialog.Root open={refuseFor !== null} onOpenChange={o => !o && setRefuseFor(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
            <Dialog.Title className="text-base font-semibold text-slate-900">Refuse this request?</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-slate-500">They&apos;ll get your reason in Messages and can reply there.</Dialog.Description>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} maxLength={500} autoFocus
              placeholder="e.g. Payment not received yet"
              className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10" />
            {error && <p role="alert" className="mt-2 text-xs text-rose-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Dialog.Close className={`${btn.base} ${btn.secondary} px-3 py-2`}>Cancel</Dialog.Close>
              <button type="button" onClick={refuse} disabled={busy !== null || reason.trim().length < 5}
                className="rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
                {busy ? "Refusing…" : "Refuse request"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
