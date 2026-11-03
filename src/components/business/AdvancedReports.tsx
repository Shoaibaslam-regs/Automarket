"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Download, Lock, Minus } from "lucide-react";
import { changePct, defaultReportDays, reportCsv } from "@/lib/advancedReport";

type Totals = { salesCount: number; salesValue: number; rentalsCompleted: number; rentalIncome: number; bookingsMade: number; newCustomers: number };
type Report = {
  range: { from: string; to: string; days: number };
  current: Totals;
  previous: Totals;
  byVehicle: { name: string; make: string; sales: number; salesValue: number; rentals: number; rentalIncome: number; total: number }[];
  byStaff: { name: string; sales: number; salesValue: number; walkInRentals: number; rentalIncome: number; total: number }[];
  byMake: { make: string; salesValue: number; rentalIncome: number; total: number }[];
  bySource: { sales: { online: number; walkIn: number }; rentals: { online: number; walkIn: number } };
};

const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString("en-PK")}`;
const card = "rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5";

const TOTALS: { key: keyof Totals; label: string; money?: boolean }[] = [
  { key: "salesValue", label: "Sales value", money: true },
  { key: "salesCount", label: "Vehicles sold" },
  { key: "rentalIncome", label: "Rental income", money: true },
  { key: "rentalsCompleted", label: "Rentals returned" },
  { key: "bookingsMade", label: "Bookings made" },
  { key: "newCustomers", label: "New customers" },
];

function Change({ cur, prev }: { cur: number; prev: number }) {
  const pct = changePct(cur, prev);
  if (pct === null) return <span className="text-slate-400">nothing before to compare</span>;
  if (pct === 0) return <span className="inline-flex items-center gap-0.5 text-slate-500"><Minus size={12} /> same as before</span>;
  const up = pct > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold ${up ? "text-emerald-600" : "text-rose-600"}`}>
      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {up ? "+" : ""}{pct}% vs previous
    </span>
  );
}

/**
 * Business → Reports → Advanced reports (Ultimate; owner and managers): any date range compared with the period just
 * before it, the range per vehicle, team member, make and online / walk-in, and a CSV of it all
 * (GET /api/business/reports/advanced, rules in src/lib/advancedReport.ts). Other plans see what it offers.
 */
export default function AdvancedReports() {
  const [days, setDays] = useState(defaultReportDays);
  const [data, setData] = useState<Report | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/business/reports/advanced?from=${days.from}&to=${days.to}`)
      .then(async r => {
        const d = await r.json().catch(() => ({}));
        if (r.status === 403 && d.code === "PLAN_FEATURE") { setLocked(d.plan); return; }
        if (!r.ok) { setError(d.error || "Couldn't build the report"); return; }
        setError("");
        setData(d);
      })
      .catch(() => setError("Couldn't build the report"));
  }, [days]);

  function exportCsv() {
    if (!data) return;
    const t = TOTALS.map(x => [x.label, data.current[x.key], data.previous[x.key], changePct(data.current[x.key], data.previous[x.key]) ?? ""]);
    const csv = reportCsv([
      { title: `AutoGO report ${data.range.from} to ${data.range.to} (${data.range.days} days)`, rows: [["Figure", "This period", "Previous period", "Change %"], ...t] },
      { title: "By vehicle", rows: [["Vehicle", "Make", "Sold", "Sales value", "Rentals", "Rental income", "Total"], ...data.byVehicle.map(v => [v.name, v.make, v.sales, v.salesValue, v.rentals, v.rentalIncome, v.total])] },
      { title: "By team member", rows: [["Member", "Sales", "Sales value", "Walk-in rentals", "Rental income", "Total"], ...data.byStaff.map(s => [s.name, s.sales, s.salesValue, s.walkInRentals, s.rentalIncome, s.total])] },
      { title: "By make", rows: [["Make", "Sales value", "Rental income", "Total"], ...data.byMake.map(m => [m.make, m.salesValue, m.rentalIncome, m.total])] },
      { title: "Online or walk-in", rows: [["", "Online", "Walk-in"], ["Sales", data.bySource.sales.online, data.bySource.sales.walkIn], ["Rentals", data.bySource.rentals.online, data.bySource.rentals.walkIn]] },
    ]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `autogo-report-${data.range.from}-to-${data.range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (locked) {
    return (
      <section className={`${card} mt-5`} aria-label="Advanced reports">
        <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><Lock size={15} className="text-slate-400" /> Advanced reports are on {locked}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Any date range compared with the period before it, income per vehicle and per team member, by make and online or walk-in, and a spreadsheet export.
        </p>
        <Link href="/pricing" className="mt-3 inline-block text-xs font-semibold text-indigo-600 hover:underline">See {locked} →</Link>
      </section>
    );
  }

  const input = "h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900";
  return (
    <section className="mt-5 space-y-4" aria-label="Advanced reports">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Advanced reports</h2>
          <p className="text-xs text-slate-500">Any range, compared with the same number of days just before it</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] text-slate-500">From<input type="date" value={days.from} max={days.to} onChange={e => e.target.value && setDays(d => ({ ...d, from: e.target.value }))} className={`${input} mt-0.5 block`} /></label>
          <label className="text-[11px] text-slate-500">To<input type="date" value={days.to} min={days.from} max={defaultReportDays().to} onChange={e => e.target.value && setDays(d => ({ ...d, to: e.target.value }))} className={`${input} mt-0.5 block`} /></label>
          <button type="button" onClick={exportCsv} disabled={!data} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {error && <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {TOTALS.map(t => (
              <div key={t.key} className={card}>
                <p className="text-[11px] text-slate-500">{t.label}</p>
                <p className="mt-1 text-xl font-extrabold tabular-nums text-slate-900">{t.money ? pkr(data.current[t.key]) : data.current[t.key]}</p>
                <p className="mt-1 text-[11px]"><Change cur={data.current[t.key]} prev={data.previous[t.key]} /></p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Table title="By vehicle" empty="No sales or returned rentals in this range."
              head={["Vehicle", "Sold", "Rentals", "Total"]}
              rows={data.byVehicle.map(v => [<span key="n"><span className="font-semibold text-slate-900">{v.name}</span> <span className="text-slate-400">{v.make}</span></span>, v.sales, v.rentals, pkr(v.total)])} />
            <Table title="By team member" empty="Nothing handled by the team in this range."
              head={["Member", "Sales", "Walk-in rentals", "Total"]}
              rows={data.byStaff.map(s => [s.name, `${s.sales} · ${pkr(s.salesValue)}`, `${s.walkInRentals} · ${pkr(s.rentalIncome)}`, pkr(s.total)])} />
            <Table title="By make" empty="No sales or returned rentals in this range."
              head={["Make", "Sales", "Rentals", "Total"]}
              rows={data.byMake.map(m => [m.make, pkr(m.salesValue), pkr(m.rentalIncome), pkr(m.total)])} />
            <Table title="Online or walk-in" empty=""
              head={["", "Online", "Walk-in"]}
              rows={[["Sales", data.bySource.sales.online, data.bySource.sales.walkIn], ["Rentals returned", data.bySource.rentals.online, data.bySource.rentals.walkIn]]} />
          </div>
        </>
      )}
    </section>
  );
}

function Table({ title, head, rows, empty }: { title: string; head: string[]; rows: React.ReactNode[][]; empty: string }) {
  return (
    <div className={`${card} min-w-0`}>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {rows.length === 0 ? <p className="mt-3 text-xs text-slate-500">{empty}</p> : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-400">{head.map((h, i) => <th key={h || i} className={`py-1.5 font-medium ${i ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={`py-2 ${j ? "text-right tabular-nums text-slate-700" : "text-slate-700"}`}>{c}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
