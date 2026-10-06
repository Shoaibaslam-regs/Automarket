"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users } from "lucide-react";

type Customer = {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  status: string;
  source: string;
  notes?: string;
  createdAt: string;
  interestedIn?: { title: string; make: string; model: string; price: number };
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  LEAD:        { bg: "#f6f8fa", color: "#57606a" },
  INTERESTED:  { bg: "#ddf4ff", color: "#0550ae" },
  TEST_DRIVE:  { bg: "#fff8c5", color: "#7d4e00" },
  NEGOTIATING: { bg: "#ffdfb6", color: "#953800" },
  SOLD:        { bg: "#dafbe1", color: "#1a7f37" },
  LOST:        { bg: "#fff0f0", color: "#cf222e" },
};

const STATUSES = ["LEAD", "INTERESTED", "TEST_DRIVE", "NEGOTIATING", "SOLD", "LOST"];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", city: "", source: "WALK_IN", status: "LEAD", notes: "" });

  useEffect(() => { fetchCustomers(); }, []);

  async function fetchCustomers() {
    const res = await fetch("/api/business/customers");
    const data = await res.json();
    setCustomers(data.customers || []);
    setLoading(false);
  }

  async function addCustomer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/business/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowAdd(false);
    setForm({ name: "", phone: "", email: "", city: "", source: "WALK_IN", status: "LEAD", notes: "" });
    fetchCustomers();
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/business/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchCustomers();
  }

  const filtered = customers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchStatus = statusFilter ? c.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

      {/* Add customer modal */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: "14px", width: "100%", maxWidth: "480px", padding: "24px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#0d1117" }}>Add customer</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#8c959f" }}>×</button>
            </div>
            <form onSubmit={addCustomer} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { label: "Full name *", name: "name", type: "text", placeholder: "Customer name", required: true },
                { label: "Phone *", name: "phone", type: "tel", placeholder: "+92 300 0000000", required: true },
                { label: "Email", name: "email", type: "email", placeholder: "customer@email.com", required: false },
                { label: "City", name: "city", type: "text", placeholder: "Karachi", required: false },
              ].map(f => (
                <div key={f.name}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#0d1117", marginBottom: "5px" }}>{f.label}</label>
                  <input type={f.type} required={f.required} placeholder={f.placeholder}
                    value={form[f.name as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#0d1117", marginBottom: "5px" }}>Source</label>
                  <select value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", background: "white" }}>
                    {["WALK_IN", "ONLINE", "REFERRAL", "PHONE", "OTHER"].map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#0d1117", marginBottom: "5px" }}>Status</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", background: "white" }}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#0d1117", marginBottom: "5px" }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                  placeholder="Any additional notes..."
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", resize: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
                <button type="button" onClick={() => setShowAdd(false)}
                  style={{ padding: "9px 18px", background: "#f6f8fa", border: "1px solid #e1e4e8", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding: "9px 18px", background: "#0d1117", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  {saving ? "Saving..." : "Add customer"}
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
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#0d1117", marginTop: "4px" }}>Customers</h1>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ padding: "9px 18px", background: "#0d1117", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          + Add customer
        </button>
      </div>

      <div style={{ padding: "20px 24px" }}>
        {/* Pipeline summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "10px", marginBottom: "16px" }}>
          {STATUSES.map(s => {
            const count = customers.filter(c => c.status === s).length;
            const style = STATUS_COLORS[s];
            return (
              <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
                style={{ padding: "10px", background: statusFilter === s ? style.bg : "white", border: `1px solid ${statusFilter === s ? style.color : "#e1e4e8"}`, borderRadius: "8px", cursor: "pointer", fontFamily: "inherit" }}>
                <p style={{ fontSize: "18px", fontWeight: 800, color: style.color }}>{count}</p>
                <p style={{ fontSize: "10px", color: style.color, fontWeight: 600 }}>{s.replace("_", " ")}</p>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..."
          style={{ width: "100%", padding: "10px 14px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", background: "white", marginBottom: "16px", boxSizing: "border-box" }} />

        {/* List */}
        <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#57606a" }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center" }}>
              <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#8c959f" }}><Users size={25} strokeWidth={1.5} /></div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#0d1117", marginBottom: "6px" }}>No customers yet</p>
              <button onClick={() => setShowAdd(true)} style={{ fontSize: "13px", color: "#0d1117", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
                Add your first customer
              </button>
            </div>
          ) : filtered.map((c, i) => {
            const statusStyle = STATUS_COLORS[c.status] || STATUS_COLORS.LEAD;
            return (
              <div key={c._id} style={{ padding: "14px 20px", borderBottom: i < filtered.length - 1 ? "1px solid #f6f8fa" : "none", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#0d1117", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, flexShrink: 0 }}>
                  {c.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: "150px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117", marginBottom: "2px" }}>{c.name}</p>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <a href={`tel:${c.phone}`} style={{ fontSize: "11px", color: "#57606a", textDecoration: "none" }}>{c.phone}</a>
                    {c.email && <span style={{ fontSize: "11px", color: "#57606a" }}>{c.email}</span>}
                    <span style={{ fontSize: "11px", color: "#8c959f" }}>{c.source.replace("_", " ")}</span>
                  </div>
                </div>
                {c.interestedIn && (
                  <div style={{ fontSize: "11px", color: "#57606a", background: "#f6f8fa", padding: "4px 10px", borderRadius: "20px" }}>
                    Interested in: {c.interestedIn.make} {c.interestedIn.model}
                  </div>
                )}
                <select value={c.status}
                  onChange={e => updateStatus(c._id, e.target.value)}
                  style={{ padding: "5px 10px", border: `1px solid ${statusStyle.color}`, borderRadius: "20px", fontSize: "11px", fontWeight: 600, color: statusStyle.color, background: statusStyle.bg, cursor: "pointer", outline: "none" }}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
                <a href={`https://wa.me/${c.phone.replace(/\D/g, "")}?text=Hi ${c.name}, regarding your vehicle inquiry at AutoMarket`}
                  target="_blank" rel="noreferrer"
                  style={{ padding: "5px 10px", background: "#2da44e", color: "white", borderRadius: "6px", fontSize: "11px", fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>
                  WhatsApp
                </a>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: "12px", color: "#8c959f", marginTop: "10px" }}>{filtered.length} customer{filtered.length !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}
