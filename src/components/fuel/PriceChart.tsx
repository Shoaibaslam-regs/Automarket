"use client";

import { useId, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { fuelDate } from "@/lib/fuelPrices";

export type ChartSeries = { key: string; label: string; points: { date: string; value: number }[] };

const RANGES = [
  { key: "7D", days: 7 },
  { key: "30D", days: 30 },
  // The page keeps two months of history (FUEL_HISTORY_DAYS)
  { key: "2M", days: 60 },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

const DAY = 86_400_000;
const shortDay = (d: string) => new Date(`${d}T00:00:00+05:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Karachi" });

/**
 * A crypto-style price chart: one series at a time (tabs), a big price that follows the finger or mouse along the
 * line (the latest price otherwise) with the change over the chosen range, a solid indigo line with a faint fade
 * under it, a dashed crosshair, prices on the right and 7D / 30D / 2M.
 */
export default function PriceChart({ title, subtitle, series, prefix, unit, riseIsBad = false }: {
  title: string;
  subtitle: string;
  series: ChartSeries[];
  /** Before the number: "PKR", "$" */
  prefix: string;
  /** After it: "/ litre", "/ barrel" */
  unit: string;
  riseIsBad?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const dark = useTheme().resolved === "dark";
  const c = dark
    ? { from: "#7b9cff", to: "#7b9cff", tick: "#64748b", cursor: "#475569" }
    : { from: "#4f46e5", to: "#4f46e5", tick: "#94a3b8", cursor: "#cbd5e1" };

  const [active, setActive] = useState(series[0]?.key ?? "");
  const [range, setRange] = useState<RangeKey>("30D");
  const [hover, setHover] = useState<number | null>(null);

  const current = series.find(s => s.key === active) ?? series[0];
  const days = RANGES.find(r => r.key === range)!.days;
  const rows = useMemo(() => {
    const all = current?.points ?? [];
    const last = all[all.length - 1];
    if (!last) return [];
    const since = new Date(new Date(`${last.date}T00:00:00Z`).getTime() - days * DAY).toISOString().slice(0, 10);
    return all.filter(p => p.date >= since);
  }, [current, days]);

  const shown = hover != null ? rows[hover] : rows[rows.length - 1];
  const first = rows[0];
  const diff = shown && first ? Math.round((shown.value - first.value) * 100) / 100 : null;
  const pct = diff != null && first?.value ? Math.round((diff / first.value) * 10_000) / 100 : null;
  const up = (diff ?? 0) > 0;
  const tone = diff == null || diff === 0 ? "text-slate-500" : up === riseIsBad ? "text-rose-600" : "text-emerald-600";
  const Icon = diff == null || diff === 0 ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const fmt = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Mouse or finger on the chart: recharts gives the index of the point under it
  const onMove = (state: { activeTooltipIndex?: number | string | null } | null) => {
    const i = Number(state?.activeTooltipIndex);
    setHover(Number.isFinite(i) ? i : null);
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        {series.length > 1 && (
          <div role="tablist" aria-label="Series" className="inline-flex rounded-xl bg-slate-100 p-1">
            {series.map(s => (
              <button key={s.key} type="button" role="tab" aria-selected={s.key === current?.key} onClick={() => { setActive(s.key); setHover(null); }}
                className={`rounded-lg px-3 py-1 text-[13px] font-semibold transition ${s.key === current?.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* The price: the latest, or the day under the finger / mouse */}
      <div className="mt-4 min-h-[64px]" aria-live="polite">
        {shown ? (
          <>
            <p className="text-[28px] font-bold leading-none tracking-tight text-slate-900 tabular-nums sm:text-3xl">
              <span className="mr-1 text-base font-semibold text-slate-400">{prefix}</span>{fmt(shown.value)}
              <span className="ml-1 text-sm font-medium text-slate-400">{unit}</span>
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[13px]">
              {diff != null && first !== shown && (
                <span className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${tone}`}>
                  <Icon size={15} /> {up ? "+" : diff < 0 ? "−" : ""}{fmt(Math.abs(diff))}{pct != null && ` (${up ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct).toFixed(2)}%)`}
                </span>
              )}
              <span className="text-slate-400">{hover != null ? fuelDate(shown.date) : `${fuelDate(shown.date)} · ${range}`}</span>
            </p>
          </>
        ) : null}
      </div>

      {rows.length < 2 ? (
        <p className="py-14 text-center text-sm text-slate-500">Not enough history yet. The chart fills in as prices are recorded.</p>
      ) : (
        <div className="mt-2 h-56 sm:h-64" onMouseLeave={() => setHover(null)}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
              <defs>
                <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={c.from} />
                  <stop offset="100%" stopColor={c.to} />
                </linearGradient>
                <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c.from} stopOpacity={dark ? 0.35 : 0.22} />
                  <stop offset="100%" stopColor={c.to} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tickFormatter={shortDay} tick={{ fill: c.tick, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={32} />
              <YAxis orientation="right" domain={["auto", "auto"]} tick={{ fill: c.tick, fontSize: 11 }} axisLine={false} tickLine={false} width={52}
                tickFormatter={(v: number) => v.toLocaleString("en-US", { maximumFractionDigits: v >= 100 ? 0 : 1 })} />
              {/* The crosshair only: the price above shows the value */}
              <Tooltip content={() => null} cursor={{ stroke: c.cursor, strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area type="monotone" dataKey="value" stroke={`url(#${id}-line)`} strokeWidth={2.25} fill={`url(#${id}-fill)`}
                dot={false} activeDot={{ r: 5, fill: c.from, stroke: dark ? "#0f172a" : "#ffffff", strokeWidth: 2 }} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div role="radiogroup" aria-label="Range" className="mt-3 flex gap-1">
        {RANGES.map(r => (
          <button key={r.key} type="button" role="radio" aria-checked={range === r.key} onClick={() => { setRange(r.key); setHover(null); }}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${range === r.key ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}>
            {r.key}
          </button>
        ))}
      </div>
    </section>
  );
}
