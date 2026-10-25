"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Landmark } from "lucide-react";
import { PAYMENT_FIELDS, type PaymentDetails } from "@/lib/paymentDetails";

// Shared between every card on the page, so the details are fetched once
let cached: Promise<PaymentDetails | null> | null = null;
function loadDetails() {
  cached ??= fetch("/api/payment-details").then(r => (r.ok ? r.json() : null)).then(d => d?.details ?? null).catch(() => { cached = null; return null; });
  return cached;
}

function CopyValue({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {})}
      aria-label={done ? "Copied" : "Copy"}
      title={done ? "Copied" : "Copy"}
      className="flex-shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
    >
      {done ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
    </button>
  );
}

/**
 * "How to pay": the AutoGO bank account and wallet numbers an admin set on the admin Overview.
 * Shows nothing until they are set. Used on the pricing page, the upgrade dialog, Business → Promote and support.
 */
export default function PaymentDetailsCard({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const [details, setDetails] = useState<PaymentDetails | null>(null);
  useEffect(() => { loadDetails().then(setDetails); }, []);
  if (!details) return null;

  const rows = PAYMENT_FIELDS.filter(f => f.key !== "note" && details[f.key]);
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white ${compact ? "p-4" : "p-5 sm:p-6"} ${className}`}>
      <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <Landmark size={16} className="text-indigo-600" /> How to pay
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        Send the payment to this account, then send the team the transaction ID so they can switch it on.
      </p>
      <dl className={`mt-3 grid gap-x-6 ${compact ? "" : "sm:grid-cols-2"}`}>
        {rows.map(f => (
          <div key={f.key} className="flex items-center justify-between gap-2 border-t border-slate-100 py-2">
            <div className="min-w-0">
              <dt className="text-[11px] font-medium text-slate-400">{f.label}</dt>
              <dd className="break-all text-sm font-semibold text-slate-900 tabular-nums">{details[f.key]}</dd>
            </div>
            {f.key !== "accountTitle" && f.key !== "bankName" && <CopyValue value={details[f.key].replace(/\s+/g, "")} />}
          </div>
        ))}
      </dl>
      {details.note && <p className="mt-2 text-xs leading-relaxed text-slate-600">{details.note}</p>}
    </section>
  );
}
