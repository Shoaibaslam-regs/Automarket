"use client";

import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { FuelPageData } from "@/lib/publicFuel";

type Range = 7 | 30;
const short = (d: string) => new Date(`${d}T00:00:00+05:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Karachi" });

/**
 * The fuel page's trend charts (recharts): Pakistan's approved petrol and diesel prices and Brent / WTI daily
 * closes, for the last 7 or 30 days of data. SVG colours can't read the theme's CSS variables, so they're picked
 * from the resolved theme (indigo and sky, the AutoGO accents).
 */
export default function FuelCharts({ pkHistory, oilHistory }: Pick<FuelPageData, "pkHistory" | "oilHistory">) {
  const [range, setRange] = useState<Range>(30);
  const dark = useTheme().resolved === "dark";
  const c = dark
    ? { a: "#818cf8", b: "#38bdf8", grid: "#263248", tick: "#7d8ba1", tip: "#0f172a", tipText: "#e2e8f0" }
    : { a: "#4f46e5", b: "#0284c7", grid: "#eef2f6", tick: "#94a3b8", tip: "#ffffff", tipText: "#0f172a" };

  const pk = pkHistory.slice(-range).map(d => ({ day: short(d.date), Petrol: d.petrol, Diesel: d.diesel }));
  const byDate = new Map<string, { day: string; Brent?: number; WTI?: number }>();
  for (const p of oilHistory.BRENT.slice(-range)) byDate.set(p.date, { ...byDate.get(p.date), day: short(p.date), Brent: p.price });
  for (const p of oilHistory.WTI.slice(-range)) byDate.set(p.date, { ...byDate.get(p.date), day: short(p.date), WTI: p.price });
  const oil = [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, v]) => v);

  const axis = { tick: { fill: c.tick, fontSize: 11 }, axisLine: false, tickLine: false } as const;
  const tip = { contentStyle: { background: c.tip, border: "none", borderRadius: 12, boxShadow: "0 10px 30px -12px rgba(15,23,42,0.35)", color: c.tipText, fontSize: 12 } };

  const chart = (title: string, note: string, rows: Record<string, unknown>[], keys: [string, string], unit: string) => (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500">{note}</p>
      {rows.length < 2 ? (
        <p className="py-12 text-center text-sm text-slate-500">Not enough history yet. The chart fills in as prices are recorded.</p>
      ) : (
        <div className="mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid stroke={c.grid} vertical={false} />
              <XAxis dataKey="day" {...axis} minTickGap={18} />
              <YAxis {...axis} domain={["auto", "auto"]} width={48} />
              <Tooltip {...tip} formatter={v => [`${unit} ${Number(v).toFixed(2)}`]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey={keys[0]} stroke={c.a} strokeWidth={2.2} dot={false} connectNulls />
              <Line type="monotone" dataKey={keys[1]} stroke={c.b} strokeWidth={2.2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Price trends</h2>
        <div role="radiogroup" aria-label="Range" className="inline-flex rounded-xl bg-slate-100 p-1">
          {([7, 30] as const).map(r => (
            <button key={r} type="button" role="radio" aria-checked={range === r} onClick={() => setRange(r)}
              className={`rounded-lg px-3 py-1 text-[13px] font-semibold transition ${range === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>
              {r} days
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {chart("Pakistan petrol & diesel", "PKR per litre, approved official prices", pk, ["Petrol", "Diesel"], "PKR")}
        {chart("Brent & WTI crude", "USD per barrel, daily close (Alpha Vantage / U.S. EIA)", oil, ["Brent", "WTI"], "$")}
      </div>
    </div>
  );
}
