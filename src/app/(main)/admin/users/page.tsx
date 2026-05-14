 "use client";

import { useState, useEffect } from "react";

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
  const [updating, setUpdating] = useState<string | null>(null);

  // POPUP STATES (ONLY ADDITION)
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupType, setPopupType] = useState<"DELETE" | "ROLE" | null>(null);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [pendingRole, setPendingRole] = useState<string>("");

  useEffect(() => {
    fetchUsers();
  }, []);

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
    setUpdating(id);
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setUpdating(null);
    fetchUsers();
  }

  // OPEN POPUP (ONLY ADDITION)
  function openDeletePopup(user: User) {
    setTargetUser(user);
    setPopupType("DELETE");
    setPopupOpen(true);
  }

  function openRolePopup(user: User, role: string) {
    setTargetUser(user);
    setPendingRole(role);
    setPopupType("ROLE");
    setPopupOpen(true);
  }

  function closePopup() {
    setPopupOpen(false);
    setTargetUser(null);
    setPopupType(null);
  }

  function confirmAction() {
    if (!targetUser) return;

    if (popupType === "DELETE") {
      deleteUser(targetUser._id);
    }

    if (popupType === "ROLE") {
      updateRole(targetUser._id, pendingRole);
    }

    closePopup();
  }

  const filtered = users.filter(
    u =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <a href="/admin" style={{ fontSize: "13px", color: "#57606a", textDecoration: "none" }}>← Admin</a>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0d1117", marginTop: "8px" }}>Users</h1>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users..."
            style={{ padding: "8px 14px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", width: "240px" }}
          />
        </div>

        <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #e1e4e8", background: "#f6f8fa", display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr", gap: "12px" }}>
            {["Name", "Email", "Phone", "Role", "Actions"].map(h => (
              <p key={h} style={{ fontSize: "11px", fontWeight: 600, color: "#57606a", textTransform: "uppercase" }}>{h}</p>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#57606a" }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#57606a" }}>No users found</div>
          ) : filtered.map(user => (
            <div key={user._id} style={{ padding: "14px 20px", borderBottom: "1px solid #f6f8fa", display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr", gap: "12px", alignItems: "center" }}>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#0d1117", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700 }}>
                  {user.name?.[0]?.toUpperCase() || "?"}
                </div>
                <p style={{ fontSize: "13px", fontWeight: 500 }}>{user.name || "No name"}</p>
              </div>

              <p style={{ fontSize: "12px", color: "#57606a" }}>{user.email}</p>
              <p style={{ fontSize: "12px", color: "#57606a" }}>{user.phone || "—"}</p>

              <span style={{ fontSize: "11px", fontWeight: 600, width:"55px", padding: "2px 8px", borderRadius: "20px", background: user.role === "ADMIN" ? "#fff8c5" : "#f6f8fa", color: user.role === "ADMIN" ? "#7d4e00" : "#57606a" }}>
                {user.role}
              </span>

              <div style={{ display: "flex", gap: "6px" }}>
                {user.role !== "ADMIN" ? (
                  <button onClick={() => openRolePopup(user, "ADMIN")}
                    style={{ padding: "4px 10px", background: "#fff8c5", border: "1px solid #e3b341", borderRadius: "6px", fontSize: "11px", fontWeight: 600, color: "#7d4e00" }}>
                    Make admin
                  </button>
                ) : (
                  <button onClick={() => openRolePopup(user, "USER")}
                    style={{ padding: "4px 10px", background: "#f6f8fa", border: "1px solid #d0d7de", borderRadius: "6px", fontSize: "11px", color: "#57606a" }}>
                    Remove admin
                  </button>
                )}

                <button onClick={() => openDeletePopup(user)}
                  style={{ padding: "4px 8px", background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "6px", fontSize: "11px", color: "#cf222e" }}>
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: "12px", color: "#8c959f", marginTop: "12px" }}>
          {filtered.length} user{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* POPUP (YOUR COMPONENT STYLE) */}
      {popupOpen && (
        <div
          onClick={closePopup}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "400px",
              padding: "20px",
            }}
          >
            <h3 style={{ fontSize: "16px", marginBottom: "10px" }}>
              {popupType === "DELETE"
                ? "Delete User?"
                : "Change Role?"}
            </h3>

            <p style={{ fontSize: "13px", marginBottom: "20px" }}>
              Are you sure you want to continue?
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={closePopup} style={{ padding: "8px 14px" }}>
                Cancel
              </button>
              <button onClick={confirmAction} style={{   padding: "8px 18px", background: "#cf222e", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, color: "white", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", gap: "6px"}}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}