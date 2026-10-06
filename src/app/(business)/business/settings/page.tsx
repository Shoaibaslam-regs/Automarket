"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import * as Dialog from "@radix-ui/react-dialog";

type Organization = {
  _id: string;
  name: string;
  type: string;
  plan: string;
  phone?: string;
  email?: string;
  city?: string;
  address?: string;
  description?: string;
  slug: string;
  ownerId: string;
  isActive: boolean;
};

const CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta"];
const PLAN_COLORS: Record<string, string> = { FREE: "#57606a", PRO: "#0550ae", BUSINESS: "#1a7f37" };

function DeleteBusinessDialog({ orgName, open, onOpenChange }: {
  orgName: string; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const matches = confirmText === orgName;

  function handleOpenChange(o: boolean) {
    if (deleting) return;
    if (!o) { setConfirmText(""); setError(""); }
    onOpenChange(o);
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!matches) return;
    setDeleting(true);
    setError("");
    const res = await fetch("/api/business/organizations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmName: confirmText }),
    });
    if (res.ok) {
      // Full reload so the sidebar and session-dependent UI drop the deleted business
      window.location.href = "/";
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error || "Failed to delete business");
    setDeleting(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000 }} />
        <Dialog.Content
          style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "calc(100% - 32px)", maxWidth: "460px", background: "white", borderRadius: "12px", boxShadow: "0 20px 50px rgba(0,0,0,0.2)", zIndex: 1001, overflow: "hidden", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e1e4e8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Dialog.Title style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0d1117" }}>
              Delete {orgName}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button aria-label="Close" disabled={deleting} style={{ background: "none", border: "none", cursor: "pointer", color: "#8c959f", fontSize: "20px", lineHeight: 1 }}>×</button>
            </Dialog.Close>
          </div>

          <div style={{ padding: "14px 20px", background: "#fff8c5", borderBottom: "1px solid #f0d97a", fontSize: "13px", color: "#7d4e00" }}>
            Unexpected bad things will happen if you don&apos;t read this!
          </div>

          <form onSubmit={handleDelete} style={{ padding: "20px" }}>
            <Dialog.Description asChild>
              <div style={{ fontSize: "13px", color: "#0d1117", lineHeight: 1.6 }}>
                <p style={{ margin: "0 0 10px" }}>
                  This will permanently delete the <strong>{orgName}</strong> business, including:
                </p>
                <ul style={{ margin: "0 0 14px", paddingLeft: "20px", color: "#57606a" }}>
                  <li>All customer records</li>
                  <li>All staff memberships (staff will lose access)</li>
                  <li>Business settings and public profile</li>
                </ul>
                <p style={{ margin: "0 0 14px", color: "#57606a" }}>
                  Your personal account, listings and rentals are not affected. <strong style={{ color: "#cf222e" }}>This action cannot be undone.</strong>
                </p>
              </div>
            </Dialog.Description>

            <label style={{ display: "block", fontSize: "13px", color: "#0d1117", marginBottom: "6px" }}>
              To confirm, type <strong>{orgName}</strong> in the box below
            </label>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value)} autoFocus autoComplete="off" spellCheck={false} disabled={deleting}
              style={{ width: "100%", padding: "9px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box", marginBottom: "14px" }} />

            {error && <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "#cf222e", marginBottom: "14px" }}>{error}</div>}

            <button type="submit" disabled={!matches || deleting}
              style={{ width: "100%", padding: "10px", background: matches ? "#cf222e" : "#f6f8fa", color: matches ? "white" : "#8c959f", border: matches ? "none" : "1px solid #e1e4e8", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: matches && !deleting ? "pointer" : "not-allowed", opacity: deleting ? 0.7 : 1, fontFamily: "inherit" }}>
              {deleting ? "Deleting..." : "Delete this business"}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function BusinessSettingsPage() {
  const { data: session } = useSession();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", city: "", address: "", description: "" });

  useEffect(() => {
    fetch("/api/business/organizations")
      .then(r => r.json())
      .then(d => {
        if (d.organization) {
          setOrg(d.organization);
          setForm({
            name: d.organization.name || "",
            phone: d.organization.phone || "",
            email: d.organization.email || "",
            city: d.organization.city || "",
            address: d.organization.address || "",
            description: d.organization.description || "",
          });
        }
        setLoading(false);
      });
  }, []);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/business/organizations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setSuccess("Settings saved!");
      setTimeout(() => setSuccess(""), 3000);
    } else {
      setError(data.error);
    }
  }

  const isOwner = !!org && !!session?.user?.id && String(org.ownerId) === session.user.id;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#57606a" }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

      <div style={{ padding: "20px 24px", background: "white", borderBottom: "1px solid #e1e4e8" }}>
        <Link href="/business/dashboard" style={{ fontSize: "12px", color: "#57606a", textDecoration: "none" }}>← Dashboard</Link>
        <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#0d1117", marginTop: "4px" }}>Business settings</h1>
      </div>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Plan badge */}
        <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117", marginBottom: "4px" }}>Current plan</p>
            <p style={{ fontSize: "11px", color: "#8c959f" }}>Your business is on the {org?.plan} plan</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "14px", fontWeight: 800, color: PLAN_COLORS[org?.plan || "FREE"], padding: "4px 14px", background: "#f6f8fa", border: "1px solid #e1e4e8", borderRadius: "20px" }}>
              {org?.plan}
            </span>
            {org?.plan !== "BUSINESS" && (
              <button style={{ padding: "7px 14px", background: "#0d1117", color: "white", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Upgrade
              </button>
            )}
          </div>
        </div>

        {/* Business info */}
        <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0d1117", marginBottom: "20px" }}>Business information</h2>

          {success && <div style={{ background: "#dafbe1", border: "1px solid #56d364", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#1a7f37", marginBottom: "16px" }}>{success}</div>}
          {error && <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#cf222e", marginBottom: "16px" }}>{error}</div>}

          <form onSubmit={saveSettings} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#0d1117", marginBottom: "6px" }}>Business name *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#0d1117", marginBottom: "6px" }}>Phone</label>
                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+92 300 0000000"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#0d1117", marginBottom: "6px" }}>Email</label>
                <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="business@example.com"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#0d1117", marginBottom: "6px" }}>City</label>
                <select value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", background: "white" }}>
                  <option value="">Select city</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#0d1117", marginBottom: "6px" }}>Address</label>
                <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#0d1117", marginBottom: "6px" }}>Business description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", resize: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#0d1117", marginBottom: "6px" }}>Business URL slug</label>
              <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", border: "1px solid #d0d7de", borderRadius: "8px", background: "#f6f8fa" }}>
                <span style={{ fontSize: "13px", color: "#8c959f" }}>automarket.com/biz/</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117" }}>{org?.slug}</span>
              </div>
              <p style={{ fontSize: "11px", color: "#8c959f", marginTop: "4px" }}>Your public business profile URL — cannot be changed</p>
            </div>
            <button type="submit" disabled={saving}
              style={{ padding: "11px", background: saving ? "#8c959f" : "#0d1117", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              {saving ? "Saving..." : "Save settings"}
            </button>
          </form>
        </div>

        {/* Danger zone */}
        <div style={{ background: "white", border: "1px solid #ffcdd2", borderRadius: "12px", padding: "20px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#cf222e", marginBottom: "8px" }}>Danger zone</h2>
          <p style={{ fontSize: "13px", color: "#57606a", marginBottom: "14px" }}>These actions are irreversible. Please be careful.</p>
          <button onClick={() => setDeleteOpen(true)} disabled={!isOwner}
            title={isOwner ? undefined : "Only the business owner can delete this business"}
            style={{ padding: "9px 18px", background: "white", color: "#cf222e", border: "1px solid #ffcdd2", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: isOwner ? "pointer" : "not-allowed", opacity: isOwner ? 1 : 0.5, fontFamily: "inherit" }}>
            Delete business account
          </button>
          {!isOwner && <p style={{ fontSize: "11px", color: "#8c959f", marginTop: "6px" }}>Only the business owner can delete this business.</p>}
        </div>
        {org && <DeleteBusinessDialog orgName={org.name} open={deleteOpen} onOpenChange={setDeleteOpen} />}
      </div>
    </div>
  );
}
