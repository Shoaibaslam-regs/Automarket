"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import Select from "@/components/ui/Select";
import ConfirmDialog from "@/components/business/ConfirmDialog";
import { formatLimit } from "@/lib/plans";
import { atLimit, useSubscription } from "@/components/subscription/useSubscription";

type StaffMember = {
  _id: string;
  userId: { _id: string; name?: string; email: string; phone?: string; image?: string };
  role: string;
  isActive: boolean;
  joinedAt: string;
};

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  OWNER:   { bg: "#fff8c5", color: "#7d4e00" },
  MANAGER: { bg: "#ddf4ff", color: "#0550ae" },
  SALES:   { bg: "#dafbe1", color: "#1a7f37" },
  STAFF:   { bg: "#f6f8fa", color: "#57606a" },
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("STAFF");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; message: string; planLimit?: boolean } | null>(null);

  const [canManage, setCanManage] = useState(false);
  const [pageError, setPageError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<StaffMember | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");
  const { data: sub, refresh: refreshSub } = useSubscription();
  const teamFull = !!sub && atLimit(sub.usage.staff, sub.limits.staff);

  const fetchStaff = () =>
    fetch("/api/business/staff")
      .then(res => res.json())
      .then(data => {
        setStaff(data.staff || []);
        setCanManage(!!data.permissions?.canManage);
      })
      .catch(() => setPageError("Couldn't load your team."))
      .finally(() => setLoading(false));

  useEffect(() => { fetchStaff(); }, []);

  async function inviteStaff(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    const res = await fetch("/api/business/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const data = await res.json();
    setInviting(false);
    if (res.ok) {
      setInviteResult({ ok: true, message: "Staff member added successfully!" });
      setInviteEmail("");
      fetchStaff();
      refreshSub();
      setTimeout(() => { setInviteResult(null); setShowInvite(false); }, 2000);
    } else {
      setInviteResult({ ok: false, message: data.error, planLimit: data.code === "PLAN_LIMIT_REACHED" });
    }
  }

  async function removeStaff() {
    if (!confirmRemove) return;
    setRemoveError("");
    setRemoving(true);
    const res = await fetch(`/api/business/staff/${confirmRemove._id}`, { method: "DELETE" });
    setRemoving(false);
    if (!res.ok) {
      setRemoveError((await res.json().catch(() => ({}))).error || "Failed to remove team member");
      return;
    }
    setConfirmRemove(null);
    fetchStaff();
    refreshSub();
  }

  async function updateRole(id: string, role: string) {
    setPageError("");
    const res = await fetch(`/api/business/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) setPageError((await res.json().catch(() => ({}))).error || "Failed to change role");
    fetchStaff();
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

      {/* Invite modal */}
      {showInvite && (
        <div onClick={() => setShowInvite(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: "14px", width: "100%", maxWidth: "420px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#0d1117" }}>Add staff member</h2>
              <button onClick={() => setShowInvite(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#8c959f" }}>×</button>
            </div>
            <form onSubmit={inviteStaff} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#0d1117", marginBottom: "6px" }}>Email address *</label>
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required
                  placeholder="staff@example.com"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                <p style={{ fontSize: "11px", color: "#8c959f", marginTop: "4px" }}>The user must already have an AutoMarket account</p>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#0d1117", marginBottom: "6px" }}>Role</label>
                <Select value={inviteRole} onChange={setInviteRole} ariaLabel="Role"
                  options={[
                    { value: "MANAGER", label: "Manager — full access except billing" },
                    { value: "SALES", label: "Sales — manage customers & listings" },
                    { value: "STAFF", label: "Staff — view only" },
                  ]}
                  className="h-10 rounded-lg border-[#d0d7de] text-[13px] font-normal text-[#0d1117]" />
              </div>
              {inviteResult && (
                <div style={{ padding: "10px 14px", background: inviteResult.ok ? "#dafbe1" : "#fff0f0", borderRadius: "8px", fontSize: "13px", color: inviteResult.ok ? "#1a7f37" : "#cf222e" }}>
                  {inviteResult.message}{" "}
                  {inviteResult.planLimit && <Link href="/pricing" style={{ color: "#0d1117", fontWeight: 700 }}>Upgrade plan →</Link>}
                </div>
              )}
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowInvite(false)}
                  style={{ padding: "9px 18px", background: "#f6f8fa", border: "1px solid #e1e4e8", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
                  Cancel
                </button>
                <button type="submit" disabled={inviting}
                  style={{ padding: "9px 18px", background: "#0d1117", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  {inviting ? "Adding..." : "Add member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmRemove !== null}
        onOpenChange={o => !o && setConfirmRemove(null)}
        title={`Remove ${confirmRemove?.userId?.name || confirmRemove?.userId?.email || "team member"}`}
        description={confirmRemove && (
          <>
            <strong style={{ color: "#0d1117" }}>{confirmRemove.userId?.name || confirmRemove.userId?.email}</strong> will lose access to
            this business straight away. Their AutoMarket account and their own listings are not deleted, and you can add them again later.
          </>
        )}
        confirmLabel="Remove from team"
        loadingLabel="Removing..."
        loading={removing}
        error={removeError}
        onConfirm={removeStaff}
      />

      {/* Header */}
      <div style={{ padding: "20px 24px", background: "white", borderBottom: "1px solid #e1e4e8", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <Link href="/business/dashboard" style={{ fontSize: "12px", color: "#57606a", textDecoration: "none" }}>← Dashboard</Link>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#0d1117", marginTop: "4px" }}>Staff</h1>
          {sub && (
            <p style={{ fontSize: "12px", color: teamFull ? "#cf222e" : "#57606a", marginTop: "2px" }}>
              {sub.usage.staff} of {formatLimit(sub.limits.staff)} team members on your plan (owner included)
            </p>
          )}
        </div>
        {canManage && (teamFull ? (
          <Link href="/pricing"
            style={{ padding: "9px 18px", background: "linear-gradient(90deg,#fcd34d,#f59e0b)", color: "#0d1117", borderRadius: "8px", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>
            Upgrade plan to add more
          </Link>
        ) : (
          <button onClick={() => setShowInvite(true)}
            style={{ padding: "9px 18px", background: "#0d1117", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            + Add staff member
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 24px", maxWidth: "800px" }}>
        {pageError && (
          <div role="alert" style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#cf222e", marginBottom: "14px" }}>
            {pageError}
          </div>
        )}

        {/* Role guide */}
        <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117", marginBottom: "12px" }}>Role permissions</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px" }}>
            {[
              { role: "OWNER", perms: "Full access + billing" },
              { role: "MANAGER", perms: "Full access, no billing" },
              { role: "SALES", perms: "Customers + listings" },
              { role: "STAFF", perms: "View only" },
            ].map(r => {
              const style = ROLE_COLORS[r.role];
              return (
                <div key={r.role} style={{ padding: "10px", background: style.bg, borderRadius: "8px" }}>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: style.color }}>{r.role}</p>
                  <p style={{ fontSize: "11px", color: style.color, opacity: 0.8, marginTop: "2px" }}>{r.perms}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Staff list */}
        <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#57606a" }}>Loading...</div>
          ) : staff.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center" }}>
              <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#8c959f" }}><Users size={25} strokeWidth={1.5} /></div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#0d1117", marginBottom: "6px" }}>No staff yet</p>
              <p style={{ fontSize: "13px", color: "#57606a" }}>Add team members to help manage your business</p>
            </div>
          ) : staff.map((member, i) => {
            const roleStyle = ROLE_COLORS[member.role] || ROLE_COLORS.STAFF;
            return (
              <div key={member._id} style={{ padding: "14px 20px", borderBottom: i < staff.length - 1 ? "1px solid #f6f8fa" : "none", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "#0d1117", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, flexShrink: 0 }}>
                  {member.userId?.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div style={{ flex: 1, minWidth: "150px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117" }}>{member.userId?.name || "Unknown"}</p>
                  <p style={{ fontSize: "11px", color: "#8c959f" }}>{member.userId?.email}</p>
                </div>
                <p style={{ fontSize: "11px", color: "#8c959f" }}>
                  Joined {new Date(member.joinedAt).toLocaleDateString("en-PK", { month: "short", year: "numeric" })}
                </p>
                {member.role !== "OWNER" && canManage ? (
                  <Select value={member.role} onChange={v => updateRole(member._id, v)}
                    ariaLabel="Change role"
                    size="sm"
                    options={["MANAGER", "SALES", "STAFF"].map(r => ({ value: r, label: r }))}
                    style={{ borderColor: roleStyle.color, color: roleStyle.color, background: roleStyle.bg }}
                    className="h-7 w-auto flex-shrink-0 rounded-full px-2.5 text-[11px] font-semibold" />
                ) : (
                  <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: roleStyle.bg, color: roleStyle.color }}>
                    {member.role}
                  </span>
                )}
                {member.role !== "OWNER" && canManage && (
                  <button onClick={() => { setRemoveError(""); setConfirmRemove(member); }}
                    style={{ padding: "5px 10px", background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "7px", fontSize: "11px", color: "#cf222e", cursor: "pointer", fontFamily: "inherit" }}>
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
