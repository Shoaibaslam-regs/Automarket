"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { DataTable, PageHeader, SearchField, SelectField, StatusBadge, UserCell, btn } from "@/components/admin/ui";

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

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  }

  async function updateRole(id: string, role: string) {
    setUpdating(id);
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setUpdating(null);
    fetchUsers();
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete this user?")) return;
    setUpdating(id);
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setUpdating(null);
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
                  <button onClick={() => updateRole(user._id, "ADMIN")} disabled={updating === user._id} className={`${btn.base} ${btn.warn} flex-1 md:flex-none`}>
                    <ShieldCheck size={13} /> Make admin
                  </button>
                ) : (
                  <button onClick={() => updateRole(user._id, "USER")} disabled={updating === user._id} className={`${btn.base} ${btn.secondary} flex-1 md:flex-none`}>
                    <ShieldOff size={13} /> Remove admin
                  </button>
                )}
                <button
                  onClick={() => deleteUser(user._id)}
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
    </>
  );
}
