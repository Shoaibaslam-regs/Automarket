"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { installmentSummary, type InstallmentPlan } from "@/lib/installments";
import { purchaseNumber, salePrice } from "@/lib/purchases";

type Data = {
  purchase: {
    _id: string; vehicle: { title: string }; buyer: { name: string; phone: string; cnic?: string }; plateNumber?: string;
    askingPrice: number; offerPrice?: number; agreedPrice?: number; amountPaid?: number; installmentPlan?: InstallmentPlan | null;
  };
  organization: { name: string; phone?: string; address?: string; city?: string } | null;
};

const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString()}`;
const day = (d: Date | string) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

/** Printable installment (qist) schedule for a sale, for the buyer to keep. */
export default function InstallmentSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [now] = useState(() => Date.now());

  useEffect(() => {
    fetch(`/api/business/sales/${id}`)
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Not found"); setData(d); })
      .catch(e => setError(e.message));
  }, [id]);

  if (error) return <p className="p-8 text-center text-sm text-[var(--gh-cf222e)]">{error}</p>;
  if (!data) return <div className="min-h-screen animate-pulse bg-[var(--gh-f6f8fa)]" />;
  const { purchase: p, organization: org } = data;
  const plan = p.installmentPlan;
  const sum = installmentSummary(plan);
  if (!plan || !sum) {
    return (
      <div className="p-8 text-center text-sm text-[var(--gh-57606a)]">
        This sale has no installment plan. <Link href="/business/sales" className="font-semibold underline">Back to Sales</Link>
      </div>
    );
  }

  return (
    <div className="theme-static min-h-screen bg-[var(--gh-f6f8fa)] px-4 py-6 sm:px-6">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .biz-desktop-sidebar, .biz-mobile-topbar, .no-print { display: none !important; }
          .biz-content { padding: 0 !important; }
          html, body, .biz-root { background: white !important; }
          .sheet { box-shadow: none !important; border: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[703px] items-center justify-between">
        <Link href="/business/sales" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--gh-57606a)]"><ArrowLeft size={15} /> Sales</Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-[var(--gh-0d1117)] px-4 py-2.5 text-[13px] font-semibold text-white"><Printer size={15} /> Print / Save PDF</button>
      </div>
      <article className="sheet mx-auto max-w-[703px] overflow-hidden rounded-2xl border border-[var(--gh-e1e4e8)] bg-white">
        <header className="flex items-start justify-between gap-4 bg-slate-950 px-6 py-5 text-white">
          <div>
            <p className="text-lg font-bold">{org?.name || "Business"}</p>
            <p className="mt-1 text-xs text-slate-400">{[org?.address, org?.city].filter(Boolean).join(", ")}{org?.phone ? ` · ${org.phone}` : ""}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">Installment schedule</p>
            <p className="mt-1 font-mono text-xl font-bold">{purchaseNumber(p._id)}</p>
          </div>
        </header>
        <div className="space-y-4 px-6 py-5 text-[12px]">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-[var(--gh-e1e4e8)] px-3.5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Buyer</p>
              <p className="mt-1 font-semibold text-slate-900">{p.buyer.name}</p>
              <p className="text-slate-600">{p.buyer.phone}{p.buyer.cnic ? ` · CNIC ${p.buyer.cnic}` : ""}</p>
            </div>
            <div className="rounded-xl border border-[var(--gh-e1e4e8)] px-3.5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Vehicle</p>
              <p className="mt-1 font-semibold text-slate-900">{p.vehicle.title}</p>
              {p.plateNumber && <p className="font-mono text-slate-600">{p.plateNumber}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 overflow-hidden rounded-xl border border-[var(--gh-e1e4e8)] text-center">
            {[["Price", pkr(salePrice(p))], ["Down payment", pkr(plan.downPayment)], ["Monthly", `${pkr(sum.monthly)} × ${sum.total}`], ["Left to pay", pkr(sum.left)]].map(([l, v], i) => (
              <div key={l} className={`px-2 py-2.5 ${i ? "border-l border-[var(--gh-e1e4e8)]" : ""}`}>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{l}</p>
                <p className="mt-0.5 font-bold tabular-nums text-slate-900">{v}</p>
              </div>
            ))}
          </div>
          <table className="w-full overflow-hidden rounded-xl border border-[var(--gh-e1e4e8)]">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400">
              <tr><th className="px-4 py-2">#</th><th className="px-4 py-2">Due date</th><th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2 text-right">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--gh-e1e4e8)]">
              {plan.items.map((it, i) => {
                const late = !it.paidAt && new Date(it.dueDate).getTime() < now;
                return (
                  <tr key={i}>
                    <td className="px-4 py-1.5 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-1.5 text-slate-900">{day(it.dueDate)}</td>
                    <td className="px-4 py-1.5 text-right font-semibold tabular-nums text-slate-900">{pkr(it.amount)}</td>
                    <td className={`px-4 py-1.5 text-right font-semibold ${it.paidAt ? "text-emerald-700" : late ? "text-rose-700" : "text-slate-400"}`}>
                      {it.paidAt ? `Paid ${day(it.paidAt)}` : late ? "Overdue" : "Due"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <section className="grid grid-cols-2 gap-10 pt-10">
            {["Buyer signature", `For ${org?.name || "the business"}`].map(l => (
              <div key={l}><div className="h-8 border-b border-dashed border-slate-300" /><p className="mt-2 text-xs text-slate-500">{l}</p></div>
            ))}
          </section>
        </div>
      </article>
    </div>
  );
}
