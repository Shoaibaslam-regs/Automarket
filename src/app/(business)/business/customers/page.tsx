"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, BellRing, MessageCircle, MoreHorizontal, Pencil, Search, Star, Store, Trash2, Users } from "lucide-react";
import { FollowUpDialog, FollowUpList, followUpWhen, type FollowUpItem } from "@/components/business/FollowUps";
import { isClosedDeal } from "@/lib/customers";
import { formatLimit } from "@/lib/plans";
import { atLimit, useSubscription } from "@/components/subscription/useSubscription";
import Select from "@/components/ui/Select";
import ConfirmDialog from "@/components/business/ConfirmDialog";
import Tip from "@/components/ui/Tip";
import { useQuickNew } from "@/components/business/QuickNew";

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
  LEAD:        { bg: "var(--gh-f6f8fa)", color: "var(--gh-57606a)" },
  INTERESTED:  { bg: "var(--gh-ddf4ff)", color: "var(--gh-0550ae)" },
  TEST_DRIVE:  { bg: "var(--gh-fff8c5)", color: "var(--gh-7d4e00)" },
  NEGOTIATING: { bg: "var(--gh-ffdfb6)", color: "var(--gh-953800)" },
  SOLD:        { bg: "var(--gh-dafbe1)", color: "var(--gh-1a7f37)" },
  LOST:        { bg: "var(--gh-fff0f0)", color: "var(--gh-cf222e)" },
};

const STATUSES = ["LEAD", "INTERESTED", "TEST_DRIVE", "NEGOTIATING", "SOLD", "LOST"];

const EMPTY_FORM = { name: "", phone: "", email: "", city: "", source: "WALK_IN", status: "LEAD", notes: "" };

export default function CustomersPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--gh-f6f8fa)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        <p style={{ color: "var(--gh-57606a)", fontSize: "14px" }}>Loading customers...</p>
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
  // Customer whose "More" tray is open
  const [openMore, setOpenMore] = useState<string | null>(null);
  // Dashboard "Add customer" quick action links here with ?add=1
  const [showAdd, setShowAdd] = useState(() => searchParams.get("add") === "1" || searchParams.get("new") === "customer");
  useQuickNew("customer", () => setShowAdd(true));
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<{ message: string; planLimit: boolean } | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  // Adding someone with an AutoGO account links it; outside customers are typed in by hand
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

  // Open follow-up reminders for the team
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [followFor, setFollowFor] = useState<{ _id: string; name: string } | null>(null);
  const [showLater, setShowLater] = useState(false);
  const fetchFollowUps = () =>
    fetch("/api/business/followups").then(r => r.json()).then(d => setFollowUps(d.followUps || [])).catch(() => {});
  useEffect(() => { fetchFollowUps(); }, []);
  async function markFollowUpDone(f: FollowUpItem) {
    setFollowUps(prev => prev.filter(x => x._id !== f._id));
    await fetch(`/api/business/followups/${f._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done: true }) }).catch(() => {});
  }
  const dueFollowUps = followUps.filter(f => followUpWhen(f) !== "later");
  const nextFollowUp = new Map<string, FollowUpItem>();
  followUps.forEach(f => { if (!nextFollowUp.has(f.customerId)) nextFollowUp.set(f.customerId, f); });

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
    <div style={{ minHeight: "100vh", background: "var(--gh-f6f8fa)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

      {/* Add customer modal */}
      {showAdd && (
        <div onClick={closeModal} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--gh-ffffff)", borderRadius: "14px", width: "100%", maxWidth: "480px", maxHeight: "calc(100vh - 48px)", overflowY: "auto", padding: "24px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--gh-0d1117)" }}>{editingId ? "Edit customer" : "Add customer"}</h2>
              <button onClick={closeModal} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--gh-8c959f)" }}>×</button>
            </div>
            {addError && (
              <div role="alert" style={{ background: "var(--gh-fff0f0)", border: "1px solid var(--gh-ffcdd2)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "var(--gh-cf222e)", marginBottom: "14px" }}>
                {addError.message}{" "}
                {addError.planLimit && <Link href="/pricing" style={{ color: "var(--gh-0d1117)", fontWeight: 700 }}>Upgrade plan →</Link>}
              </div>
            )}
            {!editingId && (
              <div style={{ marginBottom: "16px" }}>
                <div role="radiogroup" aria-label="Customer type" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", background: "var(--gh-f6f8fa)", border: "1px solid var(--gh-e1e4e8)", borderRadius: "10px", padding: "4px" }}>
                  {([
                    ["OUTSIDE", "Outside customer", Store],
                    ["APP", "AutoGO user", BadgeCheck],
                  ] as const).map(([type, label, Icon]) => (
                    <button key={type} type="button" role="radio" aria-checked={customerType === type} onClick={() => switchCustomerType(type)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px", borderRadius: "7px", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: customerType === type ? "var(--gh-0d1117)" : "transparent", color: customerType === type ? "var(--gh-ffffff)" : "var(--gh-57606a)" }}>
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: "11px", color: "var(--gh-8c959f)", marginTop: "6px" }}>
                  {customerType === "APP"
                    ? "Find someone with an AutoGO account by their email or account ID. Their account is linked to this customer."
                    : "Walk-ins, phone calls or referrals: anyone without an AutoGO account."}
                </p>
                {customerType === "APP" && (
                  <div style={{ marginTop: "10px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input value={lookupQuery} onChange={e => setLookupQuery(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); findUser(); } }}
                        placeholder="Email or full account ID" aria-label="Email or account ID"
                        style={{ flex: 1, minWidth: 0, padding: "9px 12px", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", fontSize: "13px", outline: "none" }} />
                      <button type="button" onClick={findUser} disabled={lookingUp || !lookupQuery.trim()}
                        style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "9px 14px", background: "var(--gh-0d1117)", color: "var(--gh-ffffff)", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: lookingUp || !lookupQuery.trim() ? 0.6 : 1 }}>
                        <Search size={13} /> {lookingUp ? "Finding…" : "Find"}
                      </button>
                    </div>
                    {lookupError && <p role="alert" style={{ fontSize: "12px", color: "var(--gh-cf222e)", marginTop: "6px" }}>{lookupError}</p>}
                    {linkedUser && (
                      <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "var(--gh-dafbe1)", border: "1px solid var(--gh-56d364)", borderRadius: "8px" }}>
                        <BadgeCheck size={16} color="#1a7f37" />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--gh-0d1117)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{linkedUser.name || linkedUser.email}</p>
                          <p style={{ fontSize: "11px", color: "var(--gh-1a7f37)" }}>{linkedUser.email} · ID #{linkedUser.id.slice(-6)}</p>
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
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--gh-0d1117)", marginBottom: "5px" }}>{f.label}</label>
                  <input type={f.type} required={f.required} placeholder={f.placeholder}
                    value={form[f.name as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--gh-0d1117)", marginBottom: "5px" }}>Source</label>
                  <Select value={form.source} onChange={v => setForm(p => ({ ...p, source: v }))} ariaLabel="Source"
                    options={["WALK_IN", "ONLINE", "REFERRAL", "PHONE", "OTHER"].map(s => ({ value: s, label: s.replace("_", " ") }))}
                    className="h-[38px] rounded-lg border-[var(--gh-d0d7de)] text-[13px] font-normal text-[var(--gh-0d1117)]" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--gh-0d1117)", marginBottom: "5px" }}>Status</label>
                  <Select value={form.status} onChange={v => setForm(p => ({ ...p, status: v }))} ariaLabel="Status"
                    options={STATUSES.map(s => ({ value: s, label: s.replace("_", " ") }))}
                    className="h-[38px] rounded-lg border-[var(--gh-d0d7de)] text-[13px] font-normal text-[var(--gh-0d1117)]" />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--gh-0d1117)", marginBottom: "5px" }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                  placeholder="Any additional notes..."
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", fontSize: "13px", outline: "none", resize: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
                <button type="button" onClick={closeModal}
                  style={{ padding: "9px 18px", background: "var(--gh-f6f8fa)", border: "1px solid var(--gh-e1e4e8)", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding: "9px 18px", background: "var(--gh-0d1117)", color: "var(--gh-ffffff)", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  {saving ? "Saving..." : editingId ? "Save changes" : "Add customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <FollowUpDialog customer={followFor} onClose={() => setFollowFor(null)} onSaved={() => { setFollowFor(null); fetchFollowUps(); }} />
      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={o => !o && setConfirmDelete(null)}
        title={`Delete ${confirmDelete?.name ?? "customer"}`}
        description={confirmDelete && (
          <>
            This deal is marked <strong style={{ color: STATUS_COLORS[confirmDelete.status]?.color }}>{confirmDelete.status}</strong>.
            Deleting <strong style={{ color: "var(--gh-0d1117)" }}>{confirmDelete.name}</strong> removes their contact details and notes permanently
            and frees a customer slot on your plan. <strong style={{ color: "var(--gh-cf222e)" }}>This can&apos;t be undone.</strong>
          </>
        )}
        confirmLabel="Delete customer"
        loading={confirmDelete !== null && deleting === confirmDelete._id}
        error={deleteError}
        onConfirm={deleteCustomer}
      />

      {/* Header */}
      <div style={{ padding: "20px 24px", background: "var(--gh-ffffff)", borderBottom: "1px solid var(--gh-e1e4e8)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <Link href="/business/dashboard" style={{ fontSize: "12px", color: "var(--gh-57606a)", textDecoration: "none" }}>← Dashboard</Link>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--gh-0d1117)", marginTop: "4px" }}>Customers</h1>
          {sub && (
            <p style={{ fontSize: "12px", color: customersFull ? "var(--gh-cf222e)" : "var(--gh-57606a)", marginTop: "2px" }}>
              {sub.usage.customers} of {formatLimit(sub.limits.customers)} customers on your plan
              {customersFull && " · delete closed deals or upgrade to add more"}
            </p>
          )}
        </div>
        {permissions.canEdit && (customersFull ? (
          <Link href="/pricing"
            style={{ padding: "9px 18px", background: "linear-gradient(90deg,#fcd34d,#f59e0b)", color: "var(--gh-0d1117)", borderRadius: "8px", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>
            Upgrade plan to add more
          </Link>
        ) : (
          <button onClick={() => setShowAdd(true)}
            style={{ padding: "9px 18px", background: "var(--gh-0d1117)", color: "var(--gh-ffffff)", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            + Add customer
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 24px" }}>
        {pageError && (
          <div role="alert" style={{ background: "var(--gh-fff0f0)", border: "1px solid var(--gh-ffcdd2)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "var(--gh-cf222e)", marginBottom: "14px" }}>
            {pageError}
          </div>
        )}
        {/* Follow-ups due today or overdue; later ones behind a toggle */}
        {followUps.length > 0 && (
          <div className="mb-4 overflow-hidden rounded-xl border border-[var(--gh-e1e4e8)] bg-white">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--gh-f6f8fa)] px-4 py-2.5">
              <p className="flex items-center gap-1.5 text-[13px] font-bold text-[var(--gh-0d1117)]">
                <BellRing size={14} /> Follow-ups <Tip id="followUp" />
                {dueFollowUps.length > 0 && <span className="text-[10px] font-bold text-[var(--gh-7d4e00)]">{dueFollowUps.length} due</span>}
              </p>
              {followUps.length > dueFollowUps.length && (
                <button onClick={() => setShowLater(v => !v)} className="text-xs font-semibold text-[var(--gh-0550ae)]">
                  {showLater ? "Hide upcoming" : `Upcoming (${followUps.length - dueFollowUps.length})`}
                </button>
              )}
            </div>
            {dueFollowUps.length === 0 && !showLater
              ? <p className="px-4 py-3 text-xs text-[var(--gh-57606a)]">Nothing due today.</p>
              : <FollowUpList items={showLater ? followUps : dueFollowUps} canEdit={permissions.canEdit} onDone={markFollowUpDone} />}
          </div>
        )}

        {/* Pipeline summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "10px", marginBottom: "16px" }}>
          <button onClick={() => setStarOnly(v => !v)} aria-pressed={starOnly}
            style={{ padding: "10px", background: starOnly ? "linear-gradient(135deg,var(--gh-fff8c5),var(--gh-ffe7a3))" : "var(--gh-ffffff)", border: `1px solid ${starOnly ? "var(--gh-d4a72c)" : "var(--gh-e1e4e8)"}`, borderRadius: "8px", cursor: "pointer", fontFamily: "inherit" }}>
            <p style={{ fontSize: "18px", fontWeight: 800, color: "var(--gh-9a6700)", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
              <Star size={15} fill="#eac54f" color="#bf8700" /> {starCount}
            </p>
            <p style={{ fontSize: "10px", color: "var(--gh-9a6700)", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "3px" }}>STAR CUSTOMERS <Tip id="starCustomer" size={11} /></p>
          </button>
          {STATUSES.map(s => {
            const count = customers.filter(c => c.status === s).length;
            const style = STATUS_COLORS[s];
            return (
              <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
                style={{ padding: "10px", background: statusFilter === s ? style.bg : "var(--gh-ffffff)", border: `1px solid ${statusFilter === s ? style.color : "var(--gh-e1e4e8)"}`, borderRadius: "8px", cursor: "pointer", fontFamily: "inherit" }}>
                <p style={{ fontSize: "18px", fontWeight: 800, color: style.color }}>{count}</p>
                <p style={{ fontSize: "10px", color: style.color, fontWeight: 600 }}>{s.replace("_", " ")}</p>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..."
          style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", fontSize: "13px", outline: "none", background: "var(--gh-ffffff)", marginBottom: "16px", boxSizing: "border-box" }} />

        {/* List */}
        <div style={{ background: "var(--gh-ffffff)", border: "1px solid var(--gh-e1e4e8)", borderRadius: "12px", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--gh-57606a)" }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center" }}>
              <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gh-8c959f)" }}><Users size={25} strokeWidth={1.5} /></div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--gh-0d1117)", marginBottom: "6px" }}>{customers.length === 0 ? "No customers yet" : "No customers match your filters"}</p>
              {permissions.canEdit && customers.length === 0 && (
                <button onClick={() => setShowAdd(true)} style={{ fontSize: "13px", color: "var(--gh-0d1117)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
                  Add your first customer
                </button>
              )}
            </div>
          ) : filtered.map((c, i) => {
            const statusStyle = STATUS_COLORS[c.status] || STATUS_COLORS.LEAD;
            const moreOpen = openMore === c._id;
            const trayBtn = "inline-flex items-center gap-1.5 rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--gh-0d1117)] transition hover:bg-[var(--gh-f6f8fa)] disabled:cursor-not-allowed disabled:opacity-40";
            const iconBtn = "inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--gh-e1e4e8)] bg-white transition hover:bg-[var(--gh-f6f8fa)]";
            return (
              <div key={c._id} className={`px-4 py-3 sm:px-5 ${i < filtered.length - 1 ? "border-b border-[var(--gh-f6f8fa)]" : ""}`}
                style={{ background: c.starred ? "linear-gradient(90deg,var(--gh-fffbeb),var(--gh-ffffff) 60%)" : "var(--gh-ffffff)", boxShadow: c.starred ? "inset 3px 0 0 #eac54f" : "none" }}>
                {/* Phones put the status under the name so the name and phone stay readable */}
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto]">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                    style={{ background: c.starred ? "linear-gradient(135deg,#f5c542,var(--gh-bf8700))" : "var(--gh-0d1117)", boxShadow: c.starred ? "0 0 0 2px white, 0 0 0 3.5px #eac54f" : "none" }}>
                    {c.name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-[var(--gh-0d1117)]">
                      <span className="truncate">{c.name}</span>
                      {c.starred && <Star size={12} fill="#eac54f" color="#bf8700" className="flex-shrink-0" aria-label="Star customer" />}
                      {c.userId && <BadgeCheck size={13} className="flex-shrink-0 text-[var(--gh-0550ae)]" aria-label="Has an AutoGO account" />}
                    </p>
                    <p className="truncate text-[11px] text-[var(--gh-57606a)]">
                      <a href={`tel:${c.phone}`} className="font-medium text-[var(--gh-0d1117)]">{c.phone}</a>
                      <span className="text-[var(--gh-8c959f)]"> · {c.source.replace("_", " ").toLowerCase()}</span>
                      {c.interestedIn && <span> · wants {c.interestedIn.make} {c.interestedIn.model}</span>}
                    </p>
                    {nextFollowUp.has(c._id) && (() => {
                      const f = nextFollowUp.get(c._id)!;
                      const w = followUpWhen(f);
                      return (
                        <p className={`flex items-center gap-1 truncate text-[11px] font-semibold ${w === "overdue" ? "text-[var(--gh-cf222e)]" : w === "today" ? "text-[var(--gh-9a6700)]" : "text-[var(--gh-57606a)]"}`}>
                          <BellRing size={10} className="flex-shrink-0" />
                          <span className="truncate">{w === "overdue" ? "Follow-up overdue" : w === "today" ? "Follow up today" : `Follow up ${new Date(f.dueAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}`}: {f.note}</span>
                        </p>
                      );
                    })()}
                  </div>
                  <Select value={c.status}
                    onChange={v => updateStatus(c._id, v)}
                    disabled={!permissions.canEdit}
                    ariaLabel={`Status for ${c.name}`}
                    size="sm"
                    options={STATUSES.map(s => ({ value: s, label: s.replace("_", " ") }))}
                    style={{ borderColor: statusStyle.color, color: statusStyle.color, background: statusStyle.bg }}
                    className="col-start-2 row-start-2 h-7 w-auto justify-self-start rounded-full px-2.5 text-[11px] font-semibold sm:col-start-auto sm:row-start-auto" />
                  <a href={`https://wa.me/${c.phone.replace(/\D/g, "")}?text=Hi ${c.name}, regarding your vehicle inquiry at AutoGO`}
                    target="_blank" rel="noreferrer" aria-label={`WhatsApp ${c.name}`} title="WhatsApp"
                    className={`${iconBtn} text-[var(--gh-1a7f37)]`}>
                    <MessageCircle size={15} />
                  </a>
                  <button type="button" onClick={() => setOpenMore(moreOpen ? null : c._id)} aria-expanded={moreOpen} aria-label={`More for ${c.name}`}
                    className={`${iconBtn} ${moreOpen ? "bg-[var(--gh-f6f8fa)] text-[var(--gh-0d1117)]" : "text-[var(--gh-57606a)]"}`}>
                    <MoreHorizontal size={15} />
                  </button>
                </div>

                {moreOpen && (
                  <div className="mt-2.5 space-y-2 rounded-xl bg-[var(--gh-f6f8fa)] p-3 sm:ml-12">
                    <p className="text-[11px] text-[var(--gh-57606a)]">
                      {c.email ? <a href={`mailto:${c.email}`} className="font-medium text-[var(--gh-0d1117)]">{c.email}</a> : "No email"}
                      {c.userId && <span> · has an AutoGO account</span>}
                    </p>
                    {(permissions.canEdit || permissions.canDelete) && (
                      <div className="flex flex-wrap gap-1.5">
                        {permissions.canEdit && (
                          <button onClick={() => toggleStar(c)} className={trayBtn} aria-pressed={!!c.starred}>
                            <Star size={13} fill={c.starred ? "#eac54f" : "none"} color={c.starred ? "#bf8700" : "currentColor"} /> {c.starred ? "Remove star" : "Mark as star customer"}
                          </button>
                        )}
                        {permissions.canEdit && (
                          <button onClick={() => setFollowFor({ _id: c._id, name: c.name })} className={trayBtn}><BellRing size={13} /> Add follow-up</button>
                        )}
                        {permissions.canEdit && (
                          <button onClick={() => openEdit(c)} className={trayBtn}><Pencil size={13} /> Edit details</button>
                        )}
                        {permissions.canDelete && (
                          <button onClick={() => { setDeleteError(""); setConfirmDelete(c); }}
                            disabled={!isClosedDeal(c.status) || deleting === c._id}
                            title={isClosedDeal(c.status) ? "Delete customer" : "Mark the deal as Sold or Lost to delete"}
                            className={`${trayBtn} border-[var(--gh-ffcdd2)] !text-[var(--gh-cf222e)] hover:bg-[var(--gh-fff0f0)]`}>
                            <Trash2 size={13} /> Delete
                          </button>
                        )}
                      </div>
                    )}
                    {permissions.canDelete && !isClosedDeal(c.status) && (
                      <p className="text-[11px] text-[var(--gh-8c959f)]">A customer can be deleted once their status is Sold or Lost.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: "12px", color: "var(--gh-8c959f)", marginTop: "10px" }}>{filtered.length} customer{filtered.length !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}
