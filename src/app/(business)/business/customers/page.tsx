"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, Pencil, Search, Star, Store, Trash2, Users } from "lucide-react";
import { isClosedDeal } from "@/lib/customers";
import { formatLimit } from "@/lib/plans";
import { atLimit, useSubscription } from "@/components/subscription/useSubscription";
import Select from "@/components/ui/Select";
import ConfirmDialog from "@/components/business/ConfirmDialog";

type Customer = {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  status: string;
  source: string;
  notes?: string;
  starred?: boolean;
  userId?: string;
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

const EMPTY_FORM = { name: "", phone: "", email: "", city: "", source: "WALK_IN", status: "LEAD", notes: "" };

export default function CustomersPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#f6f8fa", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        <p style={{ color: "#57606a", fontSize: "14px" }}>Loading customers...</p>
      </div>
    }>
      <CustomersContent />
    </Suspense>
  );
}

function CustomersContent() {
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [starOnly, setStarOnly] = useState(false);
  // Dashboard "Add customer" quick action links here with ?add=1
  const [showAdd, setShowAdd] = useState(() => searchParams.get("add") === "1");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<{ message: string; planLimit: boolean } | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  // Adding someone with an AutoMarket account links it; outside customers are typed in by hand
  const [customerType, setCustomerType] = useState<"OUTSIDE" | "APP">("OUTSIDE");
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [linkedUser, setLinkedUser] = useState<{ id: string; name: string; email: string } | null>(null);
  // null while adding; the customer's id while editing an existing one
  const [editingId, setEditingId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState({ canEdit: false, canDelete: false });
  const [pageError, setPageError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const { data: sub, refresh: refreshSub } = useSubscription();
  const customersFull = !!sub && atLimit(sub.usage.customers, sub.limits.customers);

  const fetchCustomers = () =>
    fetch("/api/business/customers")
      .then(res => res.json())
      .then(data => {
        setCustomers(data.customers || []);
        if (data.permissions) setPermissions(data.permissions);
      })
      .catch(() => setPageError("Couldn't load customers."))
      .finally(() => setLoading(false));

  useEffect(() => { fetchCustomers(); }, []);

  function closeModal() {
    setShowAdd(false);
    setEditingId(null);
    setAddError(null);
    setForm(EMPTY_FORM);
    setCustomerType("OUTSIDE");
    setLookupQuery("");
    setLookupError("");
    setLinkedUser(null);
  }

  function switchCustomerType(type: "OUTSIDE" | "APP") {
    setCustomerType(type);
    setLinkedUser(null);
    setLookupError("");
    setForm(p => ({ ...EMPTY_FORM, status: p.status, notes: p.notes, source: type === "APP" ? "ONLINE" : "WALK_IN" }));
  }

  async function findUser() {
    if (!lookupQuery.trim()) return;
    setLookingUp(true);
    setLookupError("");
    setLinkedUser(null);
    const res = await fetch(`/api/business/customers/lookup?q=${encodeURIComponent(lookupQuery.trim())}`);
    const data = await res.json().catch(() => ({}));
    setLookingUp(false);
    if (!res.ok) { setLookupError(data.error || "Lookup failed"); return; }
    setLinkedUser({ id: data.user.id, name: data.user.name, email: data.user.email });
    setForm(p => ({ ...p, name: data.user.name || p.name, email: data.user.email, phone: data.user.phone || p.phone, source: "ONLINE" }));
  }

  function openEdit(c: Customer) {
    setEditingId(c._id);
    setForm({ name: c.name, phone: c.phone, email: c.email || "", city: c.city || "", source: c.source, status: c.status, notes: c.notes || "" });
    setAddError(null);
    setShowAdd(true);
  }

  async function saveCustomer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAddError(null);
    const res = await fetch(editingId ? `/api/business/customers/${editingId}` : "/api/business/customers", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? form : { ...form, userId: linkedUser?.id }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAddError({ message: data.error || "Failed to save customer", planLimit: data.code === "PLAN_LIMIT_REACHED" });
      return;
    }
    closeModal();
    fetchCustomers();
    refreshSub();
  }

  async function updateStatus(id: string, status: string) {
    setPageError("");
    const res = await fetch(`/api/business/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setPageError(data.error || "Failed to update status");
    }
    fetchCustomers();
  }

  async function deleteCustomer() {
    const c = confirmDelete;
    if (!c) return;
    setDeleteError("");
    setDeleting(c._id);
    const res = await fetch(`/api/business/customers/${c._id}`, { method: "DELETE" });
    setDeleting(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error || "Failed to delete customer");
      return;
    }
    setConfirmDelete(null);
    fetchCustomers();
    refreshSub();
  }

  // Optimistic: flip the star right away, then roll back if the server refuses
  async function toggleStar(c: Customer) {
    const starred = !c.starred;
    setPageError("");
    setCustomers(prev => prev.map(x => (x._id === c._id ? { ...x, starred } : x)));
    const res = await fetch(`/api/business/customers/${c._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ starred }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setCustomers(prev => prev.map(x => (x._id === c._id ? { ...x, starred: !starred } : x)));
      setPageError(data.error || "Failed to update star");
    }
  }

  const starCount = customers.filter(c => c.starred).length;

  // Star customers stay pinned to the top, keeping the newest-first order within each group
  const filtered = customers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchStatus = statusFilter ? c.status === statusFilter : true;
    return matchSearch && matchStatus && (!starOnly || c.starred);
  }).sort((a, b) => Number(!!b.starred) - Number(!!a.starred));

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

      {/* Add customer modal */}
      {showAdd && (
        <div onClick={closeModal} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: "14px", width: "100%", maxWidth: "480px", maxHeight: "calc(100vh - 48px)", overflowY: "auto", padding: "24px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#0d1117" }}>{editingId ? "Edit customer" : "Add customer"}</h2>
              <button onClick={closeModal} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#8c959f" }}>×</button>
            </div>
            {addError && (
              <div role="alert" style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#cf222e", marginBottom: "14px" }}>
                {addError.message}{" "}
                {addError.planLimit && <Link href="/pricing" style={{ color: "#0d1117", fontWeight: 700 }}>Upgrade plan →</Link>}
              </div>
            )}
            {!editingId && (
              <div style={{ marginBottom: "16px" }}>
                <div role="radiogroup" aria-label="Customer type" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", background: "#f6f8fa", border: "1px solid #e1e4e8", borderRadius: "10px", padding: "4px" }}>
                  {([
                    ["OUTSIDE", "Outside customer", Store],
                    ["APP", "AutoMarket user", BadgeCheck],
                  ] as const).map(([type, label, Icon]) => (
                    <button key={type} type="button" role="radio" aria-checked={customerType === type} onClick={() => switchCustomerType(type)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px", borderRadius: "7px", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: customerType === type ? "#0d1117" : "transparent", color: customerType === type ? "white" : "#57606a" }}>
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: "11px", color: "#8c959f", marginTop: "6px" }}>
                  {customerType === "APP"
                    ? "Find someone with an AutoMarket account by their email or account ID. Their account is linked to this customer."
                    : "Walk-ins, phone calls or referrals: anyone without an AutoMarket account."}
                </p>
                {customerType === "APP" && (
                  <div style={{ marginTop: "10px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input value={lookupQuery} onChange={e => setLookupQuery(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); findUser(); } }}
                        placeholder="Email or full account ID" aria-label="Email or account ID"
                        style={{ flex: 1, minWidth: 0, padding: "9px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none" }} />
                      <button type="button" onClick={findUser} disabled={lookingUp || !lookupQuery.trim()}
                        style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "9px 14px", background: "#0d1117", color: "white", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: lookingUp || !lookupQuery.trim() ? 0.6 : 1 }}>
                        <Search size={13} /> {lookingUp ? "Finding…" : "Find"}
                      </button>
                    </div>
                    {lookupError && <p role="alert" style={{ fontSize: "12px", color: "#cf222e", marginTop: "6px" }}>{lookupError}</p>}
                    {linkedUser && (
                      <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "#dafbe1", border: "1px solid #56d364", borderRadius: "8px" }}>
                        <BadgeCheck size={16} color="#1a7f37" />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{linkedUser.name || linkedUser.email}</p>
                          <p style={{ fontSize: "11px", color: "#1a7f37" }}>{linkedUser.email} · ID #{linkedUser.id.slice(-6)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <form onSubmit={saveCustomer} style={{ display: "flex", flexDirection: "column", gap: "14px", ...(customerType === "APP" && !linkedUser && !editingId ? { opacity: 0.5, pointerEvents: "none" } : {}) }}>
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
                  <Select value={form.source} onChange={v => setForm(p => ({ ...p, source: v }))} ariaLabel="Source"
                    options={["WALK_IN", "ONLINE", "REFERRAL", "PHONE", "OTHER"].map(s => ({ value: s, label: s.replace("_", " ") }))}
                    className="h-[38px] rounded-lg border-[#d0d7de] text-[13px] font-normal text-[#0d1117]" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#0d1117", marginBottom: "5px" }}>Status</label>
                  <Select value={form.status} onChange={v => setForm(p => ({ ...p, status: v }))} ariaLabel="Status"
                    options={STATUSES.map(s => ({ value: s, label: s.replace("_", " ") }))}
                    className="h-[38px] rounded-lg border-[#d0d7de] text-[13px] font-normal text-[#0d1117]" />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#0d1117", marginBottom: "5px" }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                  placeholder="Any additional notes..."
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", outline: "none", resize: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
                <button type="button" onClick={closeModal}
                  style={{ padding: "9px 18px", background: "#f6f8fa", border: "1px solid #e1e4e8", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding: "9px 18px", background: "#0d1117", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  {saving ? "Saving..." : editingId ? "Save changes" : "Add customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={o => !o && setConfirmDelete(null)}
        title={`Delete ${confirmDelete?.name ?? "customer"}`}
        description={confirmDelete && (
          <>
            This deal is marked <strong style={{ color: STATUS_COLORS[confirmDelete.status]?.color }}>{confirmDelete.status}</strong>.
            Deleting <strong style={{ color: "#0d1117" }}>{confirmDelete.name}</strong> removes their contact details and notes permanently
            and frees a customer slot on your plan. <strong style={{ color: "#cf222e" }}>This can&apos;t be undone.</strong>
          </>
        )}
        confirmLabel="Delete customer"
        loading={confirmDelete !== null && deleting === confirmDelete._id}
        error={deleteError}
        onConfirm={deleteCustomer}
      />

      {/* Header */}
      <div style={{ padding: "20px 24px", background: "white", borderBottom: "1px solid #e1e4e8", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <Link href="/business/dashboard" style={{ fontSize: "12px", color: "#57606a", textDecoration: "none" }}>← Dashboard</Link>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#0d1117", marginTop: "4px" }}>Customers</h1>
          {sub && (
            <p style={{ fontSize: "12px", color: customersFull ? "#cf222e" : "#57606a", marginTop: "2px" }}>
              {sub.usage.customers} of {formatLimit(sub.limits.customers)} customers on your plan
              {customersFull && " · delete closed deals or upgrade to add more"}
            </p>
          )}
        </div>
        {permissions.canEdit && (customersFull ? (
          <Link href="/pricing"
            style={{ padding: "9px 18px", background: "linear-gradient(90deg,#fcd34d,#f59e0b)", color: "#0d1117", borderRadius: "8px", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>
            Upgrade plan to add more
          </Link>
        ) : (
          <button onClick={() => setShowAdd(true)}
            style={{ padding: "9px 18px", background: "#0d1117", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            + Add customer
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 24px" }}>
        {pageError && (
          <div role="alert" style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#cf222e", marginBottom: "14px" }}>
            {pageError}
          </div>
        )}
        {/* Pipeline summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "10px", marginBottom: "16px" }}>
          <button onClick={() => setStarOnly(v => !v)} aria-pressed={starOnly}
            style={{ padding: "10px", background: starOnly ? "linear-gradient(135deg,#fff8c5,#ffe7a3)" : "white", border: `1px solid ${starOnly ? "#d4a72c" : "#e1e4e8"}`, borderRadius: "8px", cursor: "pointer", fontFamily: "inherit" }}>
            <p style={{ fontSize: "18px", fontWeight: 800, color: "#9a6700", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
              <Star size={15} fill="#eac54f" color="#bf8700" /> {starCount}
            </p>
            <p style={{ fontSize: "10px", color: "#9a6700", fontWeight: 600 }}>STAR CUSTOMERS</p>
          </button>
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
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#0d1117", marginBottom: "6px" }}>{customers.length === 0 ? "No customers yet" : "No customers match your filters"}</p>
              {permissions.canEdit && customers.length === 0 && (
                <button onClick={() => setShowAdd(true)} style={{ fontSize: "13px", color: "#0d1117", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
                  Add your first customer
                </button>
              )}
            </div>
          ) : filtered.map((c, i) => {
            const statusStyle = STATUS_COLORS[c.status] || STATUS_COLORS.LEAD;
            return (
              <div key={c._id} style={{ padding: "14px 20px", borderBottom: i < filtered.length - 1 ? "1px solid #f6f8fa" : "none", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", background: c.starred ? "linear-gradient(90deg,#fffbeb,#ffffff 60%)" : "white", boxShadow: c.starred ? "inset 3px 0 0 #eac54f" : "none" }}>
                <button
                  onClick={() => permissions.canEdit && toggleStar(c)}
                  disabled={!permissions.canEdit}
                  aria-pressed={!!c.starred}
                  aria-label={c.starred ? `Remove star from ${c.name}` : `Mark ${c.name} as a star customer`}
                  title={permissions.canEdit ? (c.starred ? "Remove star" : "Mark as star customer") : c.starred ? "Star customer" : undefined}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px", borderRadius: "50%", background: "none", border: "none", padding: 0, cursor: permissions.canEdit ? "pointer" : "default", flexShrink: 0, visibility: !permissions.canEdit && !c.starred ? "hidden" : "visible" }}>
                  <Star size={18} strokeWidth={1.8} fill={c.starred ? "#eac54f" : "none"} color={c.starred ? "#bf8700" : "#c4c9d0"} />
                </button>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: c.starred ? "linear-gradient(135deg,#f5c542,#bf8700)" : "#0d1117", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, flexShrink: 0, boxShadow: c.starred ? "0 0 0 2px white, 0 0 0 3.5px #eac54f" : "none" }}>
                  {c.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: "150px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117", marginBottom: "2px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    {c.name}
                    {c.starred && (
                      <span style={{ fontSize: "9.5px", fontWeight: 800, letterSpacing: "0.06em", color: "#7d4e00", background: "linear-gradient(90deg,#fff1b8,#ffd666)", padding: "2px 7px", borderRadius: "20px", border: "1px solid #eac54f" }}>
                        ★ STAR CUSTOMER
                      </span>
                    )}
                  </p>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <a href={`tel:${c.phone}`} style={{ fontSize: "11px", color: "#57606a", textDecoration: "none" }}>{c.phone}</a>
                    {c.email && <span style={{ fontSize: "11px", color: "#57606a" }}>{c.email}</span>}
                    <span style={{ fontSize: "11px", color: "#8c959f" }}>{c.source.replace("_", " ")}</span>
                    {c.userId && (
                      <span title="Has an AutoMarket account" style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "10px", fontWeight: 700, color: "#0550ae", background: "#ddf4ff", padding: "1px 6px", borderRadius: "20px" }}>
                        <BadgeCheck size={10} /> APP USER
                      </span>
                    )}
                  </div>
                </div>
                {c.interestedIn && (
                  <div style={{ fontSize: "11px", color: "#57606a", background: "#f6f8fa", padding: "4px 10px", borderRadius: "20px" }}>
                    Interested in: {c.interestedIn.make} {c.interestedIn.model}
                  </div>
                )}
                <Select value={c.status}
                  onChange={v => updateStatus(c._id, v)}
                  disabled={!permissions.canEdit}
                  ariaLabel={`Status for ${c.name}`}
                  size="sm"
                  options={STATUSES.map(s => ({ value: s, label: s.replace("_", " ") }))}
                  style={{ borderColor: statusStyle.color, color: statusStyle.color, background: statusStyle.bg }}
                  className="h-7 w-auto flex-shrink-0 rounded-full px-2.5 text-[11px] font-semibold" />
                <a href={`https://wa.me/${c.phone.replace(/\D/g, "")}?text=Hi ${c.name}, regarding your vehicle inquiry at AutoMarket`}
                  target="_blank" rel="noreferrer"
                  style={{ padding: "5px 10px", background: "#2da44e", color: "white", borderRadius: "6px", fontSize: "11px", fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>
                  WhatsApp
                </a>
                {permissions.canEdit && (
                  <button onClick={() => openEdit(c)} aria-label={`Edit ${c.name}`} title="Edit customer"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px", background: "#f6f8fa", border: "1px solid #e1e4e8", borderRadius: "6px", color: "#57606a", cursor: "pointer", flexShrink: 0 }}>
                    <Pencil size={13} />
                  </button>
                )}
                {permissions.canDelete && (
                  <button onClick={() => { setDeleteError(""); setConfirmDelete(c); }}
                    disabled={!isClosedDeal(c.status) || deleting === c._id}
                    aria-label={`Delete ${c.name}`}
                    title={isClosedDeal(c.status) ? "Delete customer" : "Mark the deal as Sold or Lost to delete"}
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px", background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "6px", color: "#cf222e", cursor: isClosedDeal(c.status) ? "pointer" : "not-allowed", opacity: isClosedDeal(c.status) ? 1 : 0.4, flexShrink: 0 }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: "12px", color: "#8c959f", marginTop: "10px" }}>{filtered.length} customer{filtered.length !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}
