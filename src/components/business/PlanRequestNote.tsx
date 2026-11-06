"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Clock3, MessageSquare } from "lucide-react";
import PaymentDetailsCard from "@/components/subscription/PaymentDetailsCard";
import { useSubscription } from "@/components/subscription/useSubscription";

type Pending = { plan: string; planName: string; price: number; requestedAt: string };

/**
 * On the business dashboard while a plan request is waiting for the team (GET /api/support/upgrade-request): what
 * was asked for, that the business already works on its current plan meanwhile, where to pay (PaymentDetailsCard,
 * opened with How to pay) and a Send receipt button to the AutoGO Support chat. Owners and managers only; it goes
 * away once an admin activates the plan or refuses the request.
 */
export default function PlanRequestNote() {
  const { data: sub } = useSubscription();
  const [pending, setPending] = useState<Pending | null>(null);
  const [supportUserId, setSupportUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const canPay = sub?.business?.role === "OWNER" || sub?.business?.role === "MANAGER";

  useEffect(() => {
    if (!canPay) return;
    fetch("/api/support/upgrade-request")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { setPending(d?.pending ?? null); setSupportUserId(d?.supportUserId ?? null); })
      .catch(() => {});
  }, [canPay]);

  if (!canPay || !pending) return null;
  const since = new Date(pending.requestedAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", timeZone: "Asia/Karachi" });

  return (
    <section aria-label="Plan request" className="mb-5 rounded-xl border border-amber-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700">
            <Clock3 size={15} /> {pending.planName} requested · waiting for payment
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
            Sent on {since}. Your business already works on its current plan. Pay PKR {pending.price.toLocaleString("en-PK")} and send the
            receipt in Messages, and the team switches {pending.planName} on once it&apos;s confirmed.
          </p>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-800 transition hover:bg-slate-50">
            How to pay <ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
          </button>
          <Link href={`/messages${supportUserId ? `?with=${supportUserId}` : ""}`}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[13px] font-semibold text-white transition hover:bg-slate-800">
            <MessageSquare size={14} /> Send receipt
          </Link>
        </div>
      </div>
      {open && <PaymentDetailsCard compact className="mt-4" amount={{ label: pending.planName, price: pending.price }} />}
    </section>
  );
}
