"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import * as Dialog from "@radix-ui/react-dialog";
import { Ban, BriefcaseBusiness, Check, Copy, Crown, Gift, KeyRound, UserCheck, ShieldCheck, ShieldOff, Trash2, Undo2, UserCog, type LucideIcon } from "lucide-react";
import { Badge, ConfirmDialog, CopyId, DataTable, PageHeader, SearchField, SelectField, StatusBadge, UserCell, btn } from "@/components/admin/ui";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { isFreeGrant, planInfo, type PlanId, type PlanSource } from "@/lib/plans";
import PlanGiftDialog, { type PlanSourceChoice } from "@/components/admin/PlanGiftDialog";

import { ADMIN_ACCESS_HINT, ADMIN_ACCESS_LABEL, normalizeAdminAccess, type AdminAccess } from "@/lib/adminRoles";

type User = {
  _id: string;
  name?: string;
  email: string;
  phone?: string;
  role: string;
  /** FULL or MANAGER (older view-only admins come back as MANAGER) */
  adminAccess?: AdminAccess | "READ_ONLY";
  isOwner: boolean;
  /** Banned by an admin: can't sign in, listings hidden */
  bannedAt?: string;
  banReason?: string;
  effectivePlan: PlanId;
  planExpiresAt?: string;
  planSource?: PlanSource;
  createdAt: string;
};

const ACCESS_OPTIONS: { value: AdminAccess; title: string; description: string; icon: LucideIcon }[] = [
  { value: "FULL", title: ADMIN_ACCESS_LABEL.FULL, description: ADMIN_ACCESS_HINT.FULL, icon: ShieldCheck },
  { value: "MANAGER", title: ADMIN_ACCESS_LABEL.MANAGER, description: ADMIN_ACCESS_HINT.MANAGER, icon: BriefcaseBusiness },
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
  const selected = choice ?? (promoting ? null : normalizeAdminAccess(user?.adminAccess));

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
            <span className="flex flex-shrink-0 items-center justify-center text-violet-700">
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
              disabled={busy || !selected || (!promoting && selected === normalizeAdminAccess(user.adminAccess))}
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

/** Shows a personal admin key once, with how to pass it on. */
function AdminKeyDialog({ shown, onClose }: { shown: { name: string; key: string } | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Dialog.Root open={shown !== null} onOpenChange={o => { if (!o) { setCopied(false); onClose(); } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
          <Dialog.Title className="flex items-center gap-2 text-base font-semibold text-slate-900"><KeyRound size={17} className="text-amber-500" /> Admin key for {shown?.name}</Dialog.Title>
          <Dialog.Description className="mt-1.5 text-sm leading-relaxed text-slate-500">
            Send this to them privately. They type it in the email box on the sign-in page, then enter the code emailed to them.
            It&apos;s shown only now; if it&apos;s lost, make a new one.
          </Dialog.Description>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
            <code className="min-w-0 flex-1 break-all font-mono text-sm text-slate-900">{shown?.key}</code>
            <button type="button" onClick={() => { if (shown) navigator.clipboard?.writeText(shown.key).then(() => setCopied(true)).catch(() => {}); }}
              className={`${btn.base} ${btn.secondary} flex-shrink-0`}>
              {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
            </button>
          </div>
          <div className="mt-5 flex justify-end">
            <Dialog.Close className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Done</Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const { can } = useAdminAccess();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [pending, setPending] = useState<{ action: "demote" | "delete" | "revoke"; user: User } | null>(null);
  // Banning asks for a reason (sent to them by email and kept in Activity)
  const [banFor, setBanFor] = useState<User | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banning, setBanning] = useState(false);
  const [accessFor, setAccessFor] = useState<User | null>(null);
  // A personal admin key just made, shown once to pass on
  const [shownKey, setShownKey] = useState<{ name: string; key: string } | null>(null);
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
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setActionError(data.error || "Something went wrong. Please try again.");
    } else {
      setNotice(success);
    }
    await fetchUsers();
    return res.ok ? data : null;
  }

  const json = (method: string, body: unknown): RequestInit => ({
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // Runs the demote/delete action the admin confirmed in the dialog
  async function ban() {
    if (!banFor || banReason.trim().length < 5) return;
    setBanning(true);
    await send(`/api/admin/users/${banFor._id}/ban`, json("POST", { reason: banReason }), `${displayName(banFor)} is banned. They've been signed out and emailed the reason.`);
    setBanning(false);
    setBanFor(null);
  }

  async function unban(user: User) {
    setUpdating(user._id);
    await send(`/api/admin/users/${user._id}/ban`, { method: "DELETE" }, `${displayName(user)} can sign in again, and their listings are back.`);
    setUpdating(null);
  }

  async function runPending() {
    if (!pending) return;
    const { action, user } = pending;
    setUpdating(user._id);
    if (action === "revoke") {
      await send(`/api/admin/users/${user._id}/plan`, { method: "DELETE" }, `${displayName(user)}'s gifted plan was revoked. They're back on Free.`);
    } else {
      await send(
        `/api/admin/users/${user._id}`,
        action === "delete" ? { method: "DELETE" } : json("PATCH", { role: "USER" }),
        action === "delete" ? `${displayName(user)} was deleted.` : `${displayName(user)} is no longer an admin.`
      );
    }
    setUpdating(null);
    setPending(null);
  }

  async function saveAccess(access: AdminAccess) {
    if (!accessFor) return;
    const label = access === "FULL" ? "a full admin" : "a manager";
    const data = await send(`/api/admin/users/${accessFor._id}`, json("PATCH", { role: "ADMIN", adminAccess: access }), `${displayName(accessFor)} is now ${label}.`);
    // A new admin's personal key comes back once
    if (data?.adminKey) setShownKey({ name: displayName(accessFor), key: data.adminKey });
    setAccessFor(null);
  }

  async function newAdminKey(user: User) {
    setUpdating(user._id);
    const data = await send(`/api/admin/users/${user._id}/admin-key`, { method: "POST" }, `${displayName(user)} has a new admin key. The old one no longer works.`);
    setUpdating(null);
    if (data?.adminKey) setShownKey({ name: displayName(user), key: data.adminKey });
  }

  async function savePlan(plan: PlanId, months: number, source: PlanSourceChoice) {
    if (!planFor) return;
    await send(
      `/api/admin/users/${planFor._id}/plan`,
      json("PATCH", { plan, months, source }),
      source === "PAID"
        ? `${displayName(planFor)} has ${planInfo(plan).name} for 30 days.`
        : `${displayName(planFor)} now has ${planInfo(plan).name} for free.`
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
                    {isFreeGrant(user.planSource) && user.effectivePlan !== "FREE" && (
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
                {user.bannedAt && <span title={user.banReason}><Badge tone="red">BANNED</Badge></span>}
                {user.role === "ADMIN" && !user.isOwner && (
                  <Badge tone={normalizeAdminAccess(user.adminAccess) === "MANAGER" ? "neutral" : "violet"}>
                    {normalizeAdminAccess(user.adminAccess) === "MANAGER" ? "MANAGER" : "FULL"}
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
              if (!can("plans") && !can("admins") && !can("users")) return <p className="text-xs text-slate-400 md:text-right">View only</p>;
              const self = user._id === session?.user?.id;
              const locked = self || user.isOwner;
              // Managers handle plans only; making, changing and removing admins and deleting users is for full admins
              const manageAdmins = can("admins") && !locked;
              const busy = updating === user._id;
              return (
                <div className="flex flex-wrap gap-1.5 md:flex-nowrap md:justify-end">
                  {can("plans") && <button onClick={() => setPlanFor(user)} disabled={busy} className={`${btn.base} ${btn.secondary} flex-1 md:flex-none`} title="Activate a paid plan or gift one">
                    <Gift size={13} /> Plan
                  </button>}
                  {can("plans") && isFreeGrant(user.planSource) && user.effectivePlan !== "FREE" && (
                    <button onClick={() => setPending({ action: "revoke", user })} disabled={busy} aria-label="Revoke gifted plan" title="Revoke gifted plan" className={`${btn.base} ${btn.danger}`}>
                      <Undo2 size={13} />
                    </button>
                  )}
                  {manageAdmins && (user.role !== "ADMIN" ? (
                    <button onClick={() => setAccessFor(user)} disabled={busy} className={`${btn.base} ${btn.warn} flex-1 md:flex-none`}>
                      <ShieldCheck size={13} /> Make admin
                    </button>
                  ) : (
                    <>
                      <button onClick={() => setAccessFor(user)} disabled={busy} className={`${btn.base} ${btn.secondary} flex-1 md:flex-none`} title="Change admin access">
                        <UserCog size={13} /> Access
                      </button>
                      <button onClick={() => newAdminKey(user)} disabled={busy} aria-label="New admin key" title="Make a new admin key (the old one stops working)" className={`${btn.base} ${btn.secondary}`}>
                        <KeyRound size={13} />
                      </button>
                      <button onClick={() => setPending({ action: "demote", user })} disabled={busy} aria-label="Remove admin" title="Remove admin" className={`${btn.base} ${btn.secondary}`}>
                        <ShieldOff size={13} />
                      </button>
                    </>
                  ))}
                  {can("users") && !locked && user.role !== "ADMIN" && (
                    user.bannedAt ? (
                      <button onClick={() => unban(user)} disabled={busy} className={`${btn.base} ${btn.secondary} flex-1 md:flex-none`} title={user.banReason ? `Banned: ${user.banReason}` : "Lift the ban"}>
                        <UserCheck size={13} /> Unban
                      </button>
                    ) : (
                      <button onClick={() => { setBanReason(""); setBanFor(user); }} disabled={busy} aria-label="Ban account" title="Ban: they can't sign in, and their listings are hidden" className={`${btn.base} ${btn.danger}`}>
                        <Ban size={13} />
                      </button>
                    )
                  )}
                  {can("users") && !locked && (
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
      <AdminKeyDialog shown={shownKey} onClose={() => setShownKey(null)} />
      <PlanGiftDialog
        target={planFor && { name: displayName(planFor), effectivePlan: planFor.effectivePlan, planExpiresAt: planFor.planExpiresAt }}
        onClose={() => setPlanFor(null)}
        onSave={savePlan}
      />

      <ConfirmDialog
        open={banFor !== null}
        onOpenChange={open => !open && setBanFor(null)}
        onConfirm={ban}
        loading={banning}
        tone="danger"
        icon={Ban}
        title={`Ban ${banFor ? displayName(banFor) : "this account"}?`}
        description={
          <div className="space-y-3">
            <p>They&apos;re signed out within minutes and can&apos;t sign in again, by password or Google. Their live listings are hidden, and they get an email with your reason. You can lift the ban later.</p>
            <textarea value={banReason} onChange={e => setBanReason(e.target.value)} rows={3} maxLength={500} placeholder="Reason (at least 5 characters), e.g. Scam listings reported by several buyers"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10" />
          </div>
        }
        confirmLabel="Ban account"
        loadingLabel="Banning…"
      />
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={open => !open && setPending(null)}
        onConfirm={runPending}
        loading={pending !== null && updating === pending.user._id}
        {...(pending?.action === "revoke"
          ? {
              tone: "danger" as const,
              icon: Undo2,
              title: `Revoke ${planInfo(pending.user.effectivePlan).name} from ${displayName(pending.user)}?`,
              description: (
                <>
                  <strong className="font-semibold text-slate-900">{displayName(pending.user)}</strong> goes back to the Free plan straight away,
                  along with any business they own. Their existing listings stay live, but they can&apos;t add more past the Free limits.
                </>
              ),
              confirmLabel: "Revoke plan",
              loadingLabel: "Revoking…",
            }
          : pending?.action === "demote"
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
