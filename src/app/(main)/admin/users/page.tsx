"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import * as Dialog from "@radix-ui/react-dialog";
import { Crown, Eye, Gift, ShieldCheck, ShieldOff, Trash2, UserCog, type LucideIcon } from "lucide-react";
import { Badge, ConfirmDialog, CopyId, DataTable, PageHeader, SearchField, SelectField, StatusBadge, UserCell, btn } from "@/components/admin/ui";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { PLAN_LIST, formatLimit, planInfo, type PlanId } from "@/lib/plans";

type AdminAccess = "FULL" | "READ_ONLY";

type User = {
  _id: string;
  name?: string;
  email: string;
  phone?: string;
  role: string;
  adminAccess?: AdminAccess;
  isOwner: boolean;
  effectivePlan: PlanId;
  planExpiresAt?: string;
  planSource?: "PAID" | "ADMIN_GRANT";
  createdAt: string;
};

const ACCESS_OPTIONS: { value: AdminAccess; title: string; description: string; icon: LucideIcon }[] = [
  {
    value: "FULL",
    title: "Full admin",
    description: "Can see everything and make changes: manage users, listings, plans and other admins.",
    icon: ShieldCheck,
  },
  {
    value: "READ_ONLY",
    title: "View-only admin",
    description: "Can see every page and all data in the admin panel, but can't change or delete anything.",
    icon: Eye,
  },
];

const DURATIONS: { value: number | null; label: string }[] = [
  { value: 1, label: "1 month" },
  { value: 3, label: "3 months" },
  { value: 6, label: "6 months" },
  { value: 12, label: "1 year" },
  { value: null, label: "No end date" },
];

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
const displayName = (u: User) => u.name || u.email;

function DialogShell({ open, onOpenChange, busy, children }: {
  open: boolean; onOpenChange: (o: boolean) => void; busy: boolean; children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={o => !busy && onOpenChange(o)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-slate-950/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] max-h-[calc(100vh-32px)] w-[calc(100%-32px)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/20 focus:outline-none">
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Picks an access level when promoting a user or changing an existing admin. */
function AccessDialog({ user, onClose, onSave }: {
  user: User | null; onClose: () => void; onSave: (access: AdminAccess) => Promise<void>;
}) {
  const [choice, setChoice] = useState<AdminAccess | null>(null);
  const [busy, setBusy] = useState(false);
  const promoting = user?.role !== "ADMIN";
  const selected = choice ?? (promoting ? null : user?.adminAccess ?? "FULL");

  async function save() {
    if (!selected) return;
    setBusy(true);
    await onSave(selected);
    setBusy(false);
    setChoice(null);
  }

  return (
    <DialogShell open={user !== null} onOpenChange={o => { if (!o) { setChoice(null); onClose(); } }} busy={busy}>
      {user && (
        <>
          <div className="flex gap-4">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <UserCog size={20} />
            </span>
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold text-slate-900">
                {promoting ? `Make ${displayName(user)} an admin` : `Admin access for ${displayName(user)}`}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">
                Choose what they can do in the admin panel.
              </Dialog.Description>
            </div>
          </div>

          <div role="radiogroup" aria-label="Admin access level" className="mt-5 space-y-2.5">
            {ACCESS_OPTIONS.map(opt => {
              const active = selected === opt.value;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setChoice(opt.value)}
                  className={`flex w-full gap-3 rounded-xl p-4 text-left ring-1 ring-inset transition ${
                    active ? "bg-violet-50 ring-2 ring-violet-500" : "ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={18} className={`mt-0.5 flex-shrink-0 ${active ? "text-violet-600" : "text-slate-400"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">{opt.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-slate-500">{opt.description}</span>
                  </span>
                  <span className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 ${active ? "border-violet-600 bg-violet-600 shadow-[inset_0_0_0_2px_white]" : "border-slate-300"}`} />
                </button>
              );
            })}
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
              disabled={busy || !selected || (!promoting && selected === user.adminAccess)}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Saving…" : promoting ? "Make admin" : "Save access"}
            </button>
          </div>
        </>
      )}
    </DialogShell>
  );
}

/** Gives a user any plan for free, for a set time or with no end date. */
function PlanDialog({ user, onClose, onSave }: {
  user: User | null; onClose: () => void; onSave: (plan: PlanId, months: number | null) => Promise<void>;
}) {
  const [plan, setPlan] = useState<PlanId | null>(null);
  const [months, setMonths] = useState<number | null>(1);
  const [busy, setBusy] = useState(false);
  const selected = plan ?? (user && user.effectivePlan !== "FREE" ? user.effectivePlan : "STARTER");

  function reset() { setPlan(null); setMonths(1); }

  async function save() {
    setBusy(true);
    await onSave(selected, selected === "FREE" ? null : months);
    setBusy(false);
    reset();
  }

  return (
    <DialogShell open={user !== null} onOpenChange={o => { if (!o) { reset(); onClose(); } }} busy={busy}>
      {user && (
        <>
          <div className="flex gap-4">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950">
              <Gift size={20} />
            </span>
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold text-slate-900">Gift a plan to {displayName(user)}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">
                Free of charge. Currently on <strong className="font-semibold text-slate-700">{planInfo(user.effectivePlan).name}</strong>
                {user.planExpiresAt && user.effectivePlan !== "FREE" ? ` until ${fmtDate(user.planExpiresAt)}` : ""}.
              </Dialog.Description>
            </div>
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Plan</p>
          <div role="radiogroup" aria-label="Plan" className="mt-2 grid grid-cols-2 gap-2">
            {PLAN_LIST.map(p => {
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
                  <span className="block text-sm font-semibold text-slate-900">{p.name}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {formatLimit(p.limits.listings)} listings · PKR {p.price.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>

          {selected !== "FREE" ? (
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
          ) : (
            <p className="mt-4 rounded-xl bg-slate-50 px-3.5 py-3 text-[13px] text-slate-600 ring-1 ring-inset ring-slate-200">
              Moves the user back to Free. Their existing listings stay live, but they can&apos;t post more than {PLAN_LIST[0].limits.listings}.
            </p>
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
              {busy ? "Saving…" : selected === "FREE" ? "Move to Free" : `Gift ${planInfo(selected).name}`}
            </button>
          </div>
        </>
      )}
    </DialogShell>
  );
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const { canWrite } = useAdminAccess();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [pending, setPending] = useState<{ action: "demote" | "delete"; user: User } | null>(null);
  const [accessFor, setAccessFor] = useState<User | null>(null);
  const [planFor, setPlanFor] = useState<User | null>(null);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchUsers = () =>
    fetch("/api/admin/users")
      .then(res => res.json())
      .then(data => setUsers(data.users || []))
      .catch(() => setActionError("Couldn't load users."))
      .finally(() => setLoading(false));

  useEffect(() => { fetchUsers(); }, []);

  async function send(url: string, init: RequestInit, success: string) {
    setActionError("");
    setNotice("");
    const res = await fetch(url, init);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(data.error || "Something went wrong. Please try again.");
    } else {
      setNotice(success);
    }
    await fetchUsers();
  }

  const json = (method: string, body: unknown): RequestInit => ({
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // Runs the demote/delete action the admin confirmed in the dialog
  async function runPending() {
    if (!pending) return;
    const { action, user } = pending;
    setUpdating(user._id);
    await send(
      `/api/admin/users/${user._id}`,
      action === "delete" ? { method: "DELETE" } : json("PATCH", { role: "USER" }),
      action === "delete" ? `${displayName(user)} was deleted.` : `${displayName(user)} is no longer an admin.`
    );
    setUpdating(null);
    setPending(null);
  }

  async function saveAccess(access: AdminAccess) {
    if (!accessFor) return;
    const label = access === "FULL" ? "a full admin" : "a view-only admin";
    await send(`/api/admin/users/${accessFor._id}`, json("PATCH", { role: "ADMIN", adminAccess: access }), `${displayName(accessFor)} is now ${label}.`);
    setAccessFor(null);
  }

  async function savePlan(plan: PlanId, months: number | null) {
    if (!planFor) return;
    await send(
      `/api/admin/users/${planFor._id}/plan`,
      json("PATCH", { plan, months }),
      plan === "FREE" ? `${displayName(planFor)} is back on Free.` : `${displayName(planFor)} now has ${planInfo(plan).name} for free.`
    );
    setPlanFor(null);
  }

  const q = search.toLowerCase();
  const filtered = users.filter(u =>
    (u.name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u._id.includes(q.replace(/^#/, ""))) &&
    (roleFilter ? u.role === roleFilter : true)
  );
  const adminCount = users.filter(u => u.role === "ADMIN").length;
  const premiumCount = users.filter(u => u.effectivePlan !== "FREE").length;

  return (
    <>
      <PageHeader
        title="Users"
        description={loading ? "Loading…" : `${users.length.toLocaleString()} registered · ${adminCount} admin${adminCount !== 1 ? "s" : ""} · ${premiumCount} premium`}
        actions={
          <>
            <SearchField value={search} onChange={setSearch} placeholder="Search name, email or ID…" />
            <SelectField value={roleFilter} onChange={setRoleFilter} options={["USER", "SELLER", "ADMIN"]} allLabel="All roles" ariaLabel="Filter by role" />
          </>
        }
      />

      {actionError && (
        <div role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
          {actionError}
        </div>
      )}
      {notice && !actionError && (
        <div role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200">
          {notice}
        </div>
      )}

      <DataTable
        rows={filtered}
        rowKey={u => u._id}
        loading={loading}
        empty="No users match your search"
        cols="md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_236px]"
        columns={[
          {
            header: "User",
            cell: user => <UserCell name={user.name} email={user.email} meta={<CopyId id={user._id} />} />,
          },
          {
            header: "Plan",
            cell: user => {
              const plan = planInfo(user.effectivePlan);
              return (
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold" style={{ color: plan.accent }}>
                    {user.effectivePlan === "UNLIMITED" && <Crown size={13} />}
                    {plan.name}
                    {user.planSource === "ADMIN_GRANT" && user.effectivePlan !== "FREE" && (
                      <Gift size={12} className="text-violet-500" aria-label="Gifted by an admin" />
                    )}
                  </p>
                  {user.effectivePlan !== "FREE" && (
                    <p className="truncate text-xs text-slate-400">{user.planExpiresAt ? `until ${fmtDate(user.planExpiresAt)}` : "no end date"}</p>
                  )}
                </div>
              );
            },
          },
          {
            header: "Joined",
            cell: user => <p className="text-sm tabular-nums text-slate-600">{fmtDate(user.createdAt)}</p>,
          },
          {
            header: "Role",
            cell: user => (
              <div className="flex flex-wrap gap-1">
                {user.isOwner ? <Badge tone="amber">OWNER</Badge> : <StatusBadge status={user.role} />}
                {user.role === "ADMIN" && !user.isOwner && (
                  <Badge tone={user.adminAccess === "READ_ONLY" ? "neutral" : "violet"}>
                    {user.adminAccess === "READ_ONLY" ? "VIEW ONLY" : "FULL"}
                  </Badge>
                )}
              </div>
            ),
          },
          {
            header: "Actions",
            full: true,
            hideLabel: true,
            align: "right",
            cell: user => {
              if (!canWrite) return <p className="text-xs text-slate-400 md:text-right">View only</p>;
              const self = user._id === session?.user?.id;
              const locked = self || user.isOwner;
              const busy = updating === user._id;
              return (
                <div className="flex flex-wrap gap-1.5 md:flex-nowrap md:justify-end">
                  <button onClick={() => setPlanFor(user)} disabled={busy} className={`${btn.base} ${btn.secondary} flex-1 md:flex-none`} title="Gift a plan">
                    <Gift size={13} /> Plan
                  </button>
                  {!locked && (user.role !== "ADMIN" ? (
                    <button onClick={() => setAccessFor(user)} disabled={busy} className={`${btn.base} ${btn.warn} flex-1 md:flex-none`}>
                      <ShieldCheck size={13} /> Make admin
                    </button>
                  ) : (
                    <>
                      <button onClick={() => setAccessFor(user)} disabled={busy} className={`${btn.base} ${btn.secondary} flex-1 md:flex-none`} title="Change admin access">
                        <UserCog size={13} /> Access
                      </button>
                      <button onClick={() => setPending({ action: "demote", user })} disabled={busy} aria-label="Remove admin" title="Remove admin" className={`${btn.base} ${btn.secondary}`}>
                        <ShieldOff size={13} />
                      </button>
                    </>
                  ))}
                  {!locked && (
                    <button onClick={() => setPending({ action: "delete", user })} disabled={busy} aria-label="Delete user" title="Delete user" className={`${btn.base} ${btn.danger}`}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            },
          },
        ]}
      />

      {!loading && (
        <p className="mt-3 text-xs text-slate-400">
          Showing {filtered.length} of {users.length} user{users.length !== 1 ? "s" : ""}
        </p>
      )}

      <AccessDialog user={accessFor} onClose={() => setAccessFor(null)} onSave={saveAccess} />
      <PlanDialog user={planFor} onClose={() => setPlanFor(null)} onSave={savePlan} />

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={open => !open && setPending(null)}
        onConfirm={runPending}
        loading={pending !== null && updating === pending.user._id}
        {...(pending?.action === "demote"
          ? {
              tone: "neutral" as const,
              icon: ShieldOff,
              title: `Remove admin access from ${displayName(pending.user)}?`,
              description: (
                <>
                  <strong className="font-semibold text-slate-900">{displayName(pending.user)}</strong> will lose access to the admin panel and become a regular user.
                </>
              ),
              confirmLabel: "Remove admin",
              loadingLabel: "Removing…",
            }
          : {
              tone: "danger" as const,
              icon: Trash2,
              title: `Delete ${pending ? displayName(pending.user) : "user"}?`,
              description: (
                <>
                  This permanently deletes <strong className="font-semibold text-slate-900">{pending && displayName(pending.user)}</strong>&apos;s account. This can&apos;t be undone.
                </>
              ),
              confirmLabel: "Delete user",
              loadingLabel: "Deleting…",
            })}
      />
    </>
  );
}
