"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { ConfirmDialog, DataTable, PageHeader, SearchField, SelectField, StatusBadge, UserCell, btn } from "@/components/admin/ui";

type User = {
  _id: string;
  name?: string;
  email: string;
  phone?: string;
  role: string;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [pending, setPending] = useState<{ action: "promote" | "demote" | "delete"; user: User } | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  }

  // Runs the action the admin confirmed in the dialog
  async function runPending() {
    if (!pending) return;
    const { action, user } = pending;
    setUpdating(user._id);
    setActionError("");
    const res = await fetch(`/api/admin/users/${user._id}`, action === "delete"
      ? { method: "DELETE" }
      : {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: action === "promote" ? "ADMIN" : "USER" }),
        });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(data.error || "Something went wrong. Please try again.");
    }
    setUpdating(null);
    setPending(null);
    fetchUsers();
  }

  const q = search.toLowerCase();
  const filtered = users.filter(u =>
    (u.name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
    (roleFilter ? u.role === roleFilter : true)
  );
  const adminCount = users.filter(u => u.role === "ADMIN").length;

  return (
    <>
      <PageHeader
        title="Users"
        description={loading ? "Loading…" : `${users.length.toLocaleString()} registered · ${adminCount} admin${adminCount !== 1 ? "s" : ""}`}
        actions={
          <>
            <SearchField value={search} onChange={setSearch} placeholder="Search name or email…" />
            <SelectField value={roleFilter} onChange={setRoleFilter} options={["USER", "ADMIN"]} allLabel="All roles" ariaLabel="Filter by role" />
          </>
        }
      />

      {actionError && (
        <div role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
          {actionError}
        </div>
      )}

      <DataTable
        rows={filtered}
        rowKey={u => u._id}
        loading={loading}
        empty="No users match your search"
        cols="md:grid-cols-[minmax(0,2.6fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_172px]"
        columns={[
          {
            header: "User",
            cell: user => <UserCell name={user.name} email={user.email} />,
          },
          {
            header: "Phone",
            cell: user =>
              user.phone ? (
                <p className="truncate text-sm tabular-nums text-slate-700">{user.phone}</p>
              ) : (
                <p className="text-sm text-slate-300">—</p>
              ),
          },
          {
            header: "Joined",
            cell: user => (
              <p className="text-sm tabular-nums text-slate-600">
                {new Date(user.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            ),
          },
          { header: "Role", cell: user => <StatusBadge status={user.role} /> },
          {
            header: "Actions",
            full: true,
            hideLabel: true,
            align: "right",
            cell: user => (
              <div className="flex gap-1.5 md:justify-end">
                {user.role !== "ADMIN" ? (
                  <button onClick={() => setPending({ action: "promote", user })} disabled={updating === user._id} className={`${btn.base} ${btn.warn} flex-1 md:flex-none`}>
                    <ShieldCheck size={13} /> Make admin
                  </button>
                ) : (
                  <button onClick={() => setPending({ action: "demote", user })} disabled={updating === user._id} className={`${btn.base} ${btn.secondary} flex-1 md:flex-none`}>
                    <ShieldOff size={13} /> Remove admin
                  </button>
                )}
                <button
                  onClick={() => setPending({ action: "delete", user })}
                  disabled={updating === user._id}
                  aria-label="Delete user"
                  title="Delete user"
                  className={`${btn.base} ${btn.danger}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ),
          },
        ]}
      />

      {!loading && (
        <p className="mt-3 text-xs text-slate-400">
          Showing {filtered.length} of {users.length} user{users.length !== 1 ? "s" : ""}
        </p>
      )}
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={open => !open && setPending(null)}
        onConfirm={runPending}
        loading={pending !== null && updating === pending.user._id}
        {...(pending?.action === "promote"
          ? {
              tone: "warn" as const,
              icon: ShieldCheck,
              title: `Make ${pending.user.name || pending.user.email} an admin?`,
              description: (
                <>
                  Are you sure you want to make <strong className="font-semibold text-slate-900">{pending?.user.name || pending?.user.email}</strong> an admin? They&apos;ll get full access to the admin panel,
                  including managing users, listings and bookings.
                </>
              ),
              confirmLabel: "Yes, make admin",
              loadingLabel: "Making admin…",
            }
          : pending?.action === "demote"
          ? {
              tone: "neutral" as const,
              icon: ShieldOff,
              title: `Remove admin access from ${pending.user.name || pending.user.email}?`,
              description: (
                <>
                  <strong className="font-semibold text-slate-900">{pending?.user.name || pending?.user.email}</strong> will lose access to the admin panel and become a regular user.
                </>
              ),
              confirmLabel: "Remove admin",
              loadingLabel: "Removing…",
            }
          : {
              tone: "danger" as const,
              icon: Trash2,
              title: `Delete ${pending?.user.name || pending?.user.email || "user"}?`,
              description: (
                <>
                  This permanently deletes <strong className="font-semibold text-slate-900">{pending?.user.name || pending?.user.email}</strong>&apos;s account. This can&apos;t be undone.
                </>
              ),
              confirmLabel: "Delete user",
              loadingLabel: "Deleting…",
            })}
      />
    </>
  );
}
