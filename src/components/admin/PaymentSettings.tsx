"use client";

import { useEffect, useState } from "react";
import { Panel, btn } from "@/components/admin/ui";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { PAYMENT_FIELDS, type PaymentDetails } from "@/lib/paymentDetails";

const EMPTY = Object.fromEntries(PAYMENT_FIELDS.map(f => [f.key, ""])) as PaymentDetails;

/**
 * Admin Overview box: the account people pay into for plans, the Verified badge and sponsored ads.
 * Shown as "How to pay" on the pricing page, the upgrade dialog, Business → Promote and Business → Help & support.
 */
export default function PaymentSettings() {
  // What this admin's role may do here (src/lib/adminRoles.ts)
  const canWrite = useAdminAccess().can("settings");
  const [form, setForm] = useState<PaymentDetails>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/payment-details").then(r => r.json()).then(d => d.details && setForm({ ...EMPTY, ...d.details })).catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotice("");
    const res = await fetch("/api/admin/payment-details", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setNotice(d.error || "Couldn't save"); return; }
    setForm({ ...EMPTY, ...(d.details ?? {}) });
    setNotice(d.details ? "Saved. People now see these details." : "Cleared. The payment card is hidden.");
  }

  return (
    <Panel title="Payment details" description="Where businesses and users send money for plans, the Verified badge and ads. Leave empty to hide." className="mb-4 lg:mb-6">
      <form onSubmit={save} className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
        {PAYMENT_FIELDS.map(f => (
          <label key={f.key} className={`block text-xs font-medium text-slate-600 ${f.key === "note" ? "sm:col-span-2" : ""}`}>
            {f.label}
            <input value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} maxLength={f.max} placeholder={f.placeholder}
              disabled={!canWrite}
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-slate-900 disabled:bg-slate-50" />
          </label>
        ))}
        {canWrite && (
          <div className="flex items-center gap-3 sm:col-span-2">
            <button type="submit" disabled={saving} className={`${btn.base} bg-slate-900 px-4 py-2 text-white hover:bg-slate-800`}>{saving ? "Saving…" : "Save payment details"}</button>
            {notice && <p role="status" className="text-xs font-semibold text-slate-600">{notice}</p>}
          </div>
        )}
      </form>
    </Panel>
  );
}
