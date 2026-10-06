"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Calendar, Car, MessageSquare, Users } from "lucide-react";
import { PageHeader, Panel, Segmented, StatCard } from "@/components/admin/ui";

type Period = "daily" | "weekly" | "monthly";

// Categorical slots in fixed order (validated for colour-vision deficiency); single-series charts use slot 1
const SERIES = [
  { key: "users", label: "Users", color: "#2a78d6" },
  { key: "listings", label: "Listings", color: "#eb6834" },
  { key: "bookings", label: "Bookings", color: "#1baf7a" },
] as const;
const SINGLE = "#2a78d6";

const AXIS = { fontSize: 11, fill: "#94a3b8" };
const GRID = "#eef2f6";

type AnalyticsData = {
  [key: string]: string | number;
};

type AnalyticsSummary = {
  totalUsers?: number;
  totalListings?: number;
  totalBookings?: number;
  totalMessages?: number;
  totalRevenue?: number;
  newUsersThisMonth?: number;
  newListingsThisMonth?: number;
  newBookingsThisMonth?: number;
  [key: string]: string | number | undefined;
};

type TooltipEntry = { dataKey?: string | number; name?: string; value?: number | string; color?: string };

function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  format?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[140px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-lg shadow-slate-900/10">
      <p className="mb-1.5 text-[11px] font-medium text-slate-500">{label}</p>
      {payload.map(p => (
        <div key={String(p.dataKey)} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="text-xs font-semibold tabular-nums text-slate-900">
            {format ? format(Number(p.value)) : Number(p.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {SERIES.map(s => (
        <span key={s.key} className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="h-[3px] w-3.5 rounded-full" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("daily");
  const [view, setView] = useState<"chart" | "table">("chart");

  const [dailyData, setDailyData] = useState<AnalyticsData[]>([]);
  const [weeklyData, setWeeklyData] = useState<AnalyticsData[]>([]);
  const [monthlyData, setMonthlyData] = useState<AnalyticsData[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then(r => r.json())
      .then(d => {
        setDailyData(d.dailyData || []);
        setWeeklyData(d.weeklyData || []);
        setMonthlyData(d.monthlyData || []);
        setSummary(d.summary || null);
      })
      .catch(error => {
        console.error("Failed to fetch analytics:", error);
      });
  }, []);

  const currentData = period === "daily" ? dailyData : period === "weekly" ? weeklyData : monthlyData;
  const secondary =
    period === "monthly"
      ? { key: "revenue", title: "Revenue", format: (v: number) => `PKR ${v.toLocaleString()}` }
      : { key: "messages", title: "Messages", format: (v: number) => v.toLocaleString() };

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Platform activity and growth metrics"
        actions={
          <Segmented
            value={period}
            onChange={setPeriod}
            options={[
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
            ]}
          />
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {summary ? (
          <>
            <StatCard label="New users" value={(summary.newUsersThisMonth ?? 0).toLocaleString()} icon={Users} tone="blue" hint="Last 30 days" />
            <StatCard label="New listings" value={(summary.newListingsThisMonth ?? 0).toLocaleString()} icon={Car} tone="orange" hint="Last 30 days" />
            <StatCard label="New bookings" value={(summary.newBookingsThisMonth ?? 0).toLocaleString()} icon={Calendar} tone="green" hint="Last 30 days" />
            <StatCard label="Total messages" value={(summary.totalMessages ?? 0).toLocaleString()} icon={MessageSquare} tone="violet" hint="All time" />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[124px] animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
          ))
        )}
      </div>

      {/* Main multi-series chart (with table view for accessibility) */}
      <Panel
        className="mb-4 sm:mb-6"
        title="Platform growth"
        description="New users, listings and bookings per period"
        action={
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "chart", label: "Chart" },
              { value: "table", label: "Table" },
            ]}
          />
        }
        bodyClassName="p-4 sm:p-5"
      >
        {view === "chart" ? (
          <>
            <div className="mb-3">
              <Legend />
            </div>
            <div className="h-[240px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={currentData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={16} />
                  <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }} />
                  {SERIES.map(s => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.label}
                      stroke={s.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4.5, strokeWidth: 2, stroke: "#fff" }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="max-h-[340px] overflow-auto rounded-lg border border-slate-100">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Period</th>
                  {SERIES.map(s => (
                    <th key={s.key} className="px-3 py-2 text-right font-semibold">
                      {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentData.map(row => (
                  <tr key={String(row.date)}>
                    <td className="px-3 py-2 text-slate-600">{row.date}</td>
                    {SERIES.map(s => (
                      <td key={s.key} className="px-3 py-2 text-right font-medium tabular-nums text-slate-900">
                        {Number(row[s.key] ?? 0).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Panel title="Bookings" description="New booking requests per period" bodyClassName="p-4 sm:p-5">
          <div className="h-[220px] sm:h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={16} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="bookings" name="Bookings" fill={SINGLE} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title={secondary.title}
          description={period === "monthly" ? "Platform revenue per month" : "Messages sent per period"}
          bodyClassName="p-4 sm:p-5"
        >
          <div className="h-[220px] sm:h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentData} margin={{ top: 8, right: 8, left: period === "monthly" ? 4 : -16, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={16} />
                <YAxis
                  tick={AXIS}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tickFormatter={v => (v >= 1000 ? `${Math.round(v / 1000)}K` : String(v))}
                />
                <Tooltip content={<ChartTooltip format={secondary.format} />} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey={secondary.key} name={secondary.title} fill={SINGLE} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </>
  );
}
