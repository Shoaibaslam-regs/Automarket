"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users } from "lucide-react";

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
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => { fetchStaff(); }, []);

  async function fetchStaff() {
    const res = await fetch("/api/business/staff");
    const data = await res.json();
    setStaff(data.staff || []);
    setLoading(false);
  }

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
      setTimeout(() => { setInviteResult(null); setShowInvite(false); }, 2000);
    } else {
      setInviteResult({ ok: false, message: data.error });
    }
  }

  async function removeStaff(id: string) {
    if (!confirm("Remove this staff member?")) return;
    await fetch(`/api/business/staff/${id}`, { method: "DELETE" });
    fetchStaff();
  }

  async function updateRole(id: string, role: string) {
    await fetch(`/api/business/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
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
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", background: "white" }}>
                  <option value="MANAGER">Manager — full access except billing</option>
                  <option value="SALES">Sales — manage customers & listings</option>
                  <option value="STAFF">Staff — view only</option>
                </select>
              </div>
              {inviteResult && (
                <div style={{ padding: "10px 14px", background: inviteResult.ok ? "#dafbe1" : "#fff0f0", borderRadius: "8px", fontSize: "13px", color: inviteResult.ok ? "#1a7f37" : "#cf222e" }}>
                  {inviteResult.message}
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

      {/* Header */}
      <div style={{ padding: "20px 24px", background: "white", borderBottom: "1px solid #e1e4e8", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <Link href="/business/dashboard" style={{ fontSize: "12px", color: "#57606a", textDecoration: "none" }}>← Dashboard</Link>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#0d1117", marginTop: "4px" }}>Staff</h1>
        </div>
        <button onClick={() => setShowInvite(true)}
          style={{ padding: "9px 18px", background: "#0d1117", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          + Add staff member
        </button>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: "800px" }}>

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
                {member.role !== "OWNER" ? (
                  <select value={member.role} onChange={e => updateRole(member._id, e.target.value)}
                    style={{ padding: "5px 10px", border: `1px solid ${roleStyle.color}`, borderRadius: "20px", fontSize: "11px", fontWeight: 600, color: roleStyle.color, background: roleStyle.bg, cursor: "pointer", outline: "none" }}>
                    {["MANAGER", "SALES", "STAFF"].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : (
                  <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: roleStyle.bg, color: roleStyle.color }}>
                    OWNER
                  </span>
                )}
                {member.role !== "OWNER" && (
                  <button onClick={() => removeStaff(member._id)}
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
