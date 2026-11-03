"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Calendar, Car, KeyRound, Lock, TrendingUp, Users, Wallet } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { REPORT_PERIODS, type ReportPeriod } from "@/lib/reportPeriods";
import AdvancedReports from "@/components/business/AdvancedReports";

type Stats = {
  inventory: {
    totalVehicles: number;
    available: number;
    sold: number;
    reserved: number;
  };
  customers: {
    totalCustomers: number;
    leads: number;
    testDrives: number;
    closedSales: number;
  };
  rentals: {
    totalBookings: number;
    activeRentals: number;
    pending: number;
    upcoming: number;
    completed: number;
    cancelled: number;
    online: number;
    walkIn: number;
    /** null for roles that don't see money */
    depositsHeld: number | null;
  };
  /** Business → Reports for the chosen period (src/app/api/business/stats); null when the plan doesn't include it */
  report: null | {
    period: { key: ReportPeriod; label: string };
    canSeeMoney: boolean;
    sales: { count: number; value: number | null };
    rentals: { completed: number; revenue: number | null; revenueTotal: number | null };
    byMonth: { month: string; sales: number; salesValue: number | null; rentalRevenue: number | null }[];
  };
  reportLocked: null | { plan: string };
};

/** Compact PKR: 950 → "PKR 950", 12,500 → "PKR 12.5K", 2,400,000 → "PKR 2.4M" */
function pkr(n: number) {
  if (n >= 1_000_000) return `PKR ${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `PKR ${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `PKR ${n.toLocaleString()}`;
}

export default function ReportsPage() {
  // Chart colours are SVG attributes, which can't read the CSS theme variables, so pick them per theme
  const { resolved } = useTheme();
  const chart = resolved === "dark"
    ? { ink: "#eef2f8", grid: "#263248", tick: "#7d8ba1", cursor: "#1a2436", revenue: "#818cf8" }
    : { ink: "#0d1117", grid: "#f0f0f0", tick: "#8c959f", cursor: "#f6f8fa", revenue: "#4f46e5" };
  // Sales bars beside rental income: sky, the other half of the AutoGO indigo → sky
  const salesColor = resolved === "dark" ? "#38bdf8" : "#0ea5e9";
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<ReportPeriod>("this-month");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch(`/api/business/stats?period=${period}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || !d.rentals) throw new Error(d.error || "Failed to load reports");
        setStats(d);
      })
      .catch((e) => setError(e.message === "No organization" ? "Set up your business to see reports." : "Couldn't load your reports. Please refresh to try again."))
      .finally(() => { setLoading(false); setUpdating(false); });
  }, [period]);

  if (!loading && error) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--gh-f6f8fa)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        <div role="alert" style={{ background: "var(--gh-ffffff)", border: "1px solid var(--gh-ffcdd2)", borderRadius: "14px", padding: "22px 28px", textAlign: "center" }}>
          <p style={{ margin: 0, color: "var(--gh-cf222e)", fontSize: "14px", fontWeight: 600 }}>{error}</p>
          <Link href="/business/dashboard" style={{ display: "inline-block", marginTop: "10px", fontSize: "12px", color: "var(--gh-0d1117)", fontWeight: 600 }}>← Back to dashboard</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--gh-f6f8fa)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            background: "var(--gh-ffffff)",
            border: "1px solid var(--gh-e1e4e8)",
            borderRadius: "14px",
            padding: "22px 28px",
            boxShadow: "0 8px 25px rgba(15,23,42,0.05)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "var(--gh-57606a)",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            Loading reports...
          </p>
        </div>
      </div>
    );
  }

  // The plan doesn't include Sales reports (PLAN_FEATURES in src/lib/plans.ts)
  if (stats?.reportLocked) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--gh-f6f8fa)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        <div style={{ maxWidth: "420px", background: "var(--gh-ffffff)", border: "1px solid var(--gh-e1e4e8)", borderRadius: "14px", padding: "26px 28px", textAlign: "center" }}>
          <Lock size={22} style={{ color: "var(--gh-8c959f)" }} aria-hidden />
          <h1 style={{ fontSize: "16px", fontWeight: 750, color: "var(--gh-0d1117)", margin: "10px 0 6px" }}>Sales reports are on {stats.reportLocked.plan} and up</h1>
          <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--gh-57606a)", margin: 0 }}>
            See your sales and rental income by month, for this month, last month or the whole year. Your dashboard keeps its counts on every plan.
          </p>
          <Link href="/pricing" style={{ display: "inline-block", marginTop: "16px", fontSize: "13px", fontWeight: 600, color: "var(--gh-ffffff)", background: "var(--gh-0d1117)", padding: "9px 16px", borderRadius: "10px", textDecoration: "none" }}>See plans</Link>
          <Link href="/business/dashboard" style={{ display: "block", marginTop: "12px", fontSize: "12px", color: "var(--gh-57606a)", fontWeight: 600 }}>← Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const inventoryData = [
    {
      name: "Available",
      value: stats?.inventory.available || 0,
      // AutoGO indigo, like the dashboard's Available bar
      color: "#6366f1",
    },
    {
      name: "Sold",
      value: stats?.inventory.sold || 0,
      color: "#0550ae",
    },
    {
      name: "Reserved",
      value: stats?.inventory.reserved || 0,
      color: "#e3b341",
    },
  ];

  const pipelineData = [
    {
      name: "Leads",
      value: stats?.customers.leads || 0,
    },
    {
      name: "Interested",
      value: stats?.customers.totalCustomers || 0,
    },
    {
      name: "Test Drive",
      value: stats?.customers.testDrives || 0,
    },
    {
      name: "Closed",
      value: stats?.customers.closedSales || 0,
    },
  ];

  const report = stats?.report ?? null;

  const conversionRate = stats?.customers.totalCustomers
    ? Math.round(
      (stats.customers.closedSales /
        stats.customers.totalCustomers) *
      100
    )
    : 0;

  const kpis = [
    {
      label: "Total vehicles",
      value: stats?.inventory.totalVehicles || 0,
      icon: Car,
      sub: "in inventory",
    },
    {
      label: "Total customers",
      value: stats?.customers.totalCustomers || 0,
      icon: Users,
      sub: "tracked",
    },
    {
      label: `Sales · ${report?.period.label ?? ""}`,
      value: report?.sales.count || 0,
      icon: Wallet,
      sub: report?.sales.value != null ? `${pkr(report.sales.value)} sold` : "vehicles sold",
    },
    {
      label: "Conversion rate",
      value: `${conversionRate}%`,
      icon: TrendingUp,
      sub: "leads to sales",
    },
    {
      label: "Active rentals",
      value: stats?.rentals.activeRentals || 0,
      icon: KeyRound,
      sub: `${stats?.rentals.totalBookings || 0} bookings all time`,
    },
    report?.rentals.revenue != null
      ? { label: `Rental income · ${report.period.label}`, value: pkr(report.rentals.revenue), icon: Calendar, sub: `${report.rentals.completed} completed` }
      : { label: `Rentals completed · ${report?.period.label ?? ""}`, value: report?.rentals.completed || 0, icon: Calendar, sub: "bookings returned" },
  ];

  const money = !!report?.canSeeMoney;
  const summaryColumns = [
    {
      section: "Inventory",
      rows: [
        [
          "Total vehicles",
          stats?.inventory.totalVehicles || 0,
        ],
        [
          "Available for sale",
          stats?.inventory.available || 0,
        ],
        [
          "Sold vehicles",
          stats?.inventory.sold || 0,
        ],
        [
          "Reserved / pending",
          stats?.inventory.reserved || 0,
        ],
      ],
    },
    {
      section: "Customers",
      rows: [
        [
          "Total customers",
          stats?.customers.totalCustomers || 0,
        ],
        [
          "New leads",
          stats?.customers.leads || 0,
        ],
        [
          "Test drives scheduled",
          stats?.customers.testDrives || 0,
        ],
        [
          "Deals closed",
          stats?.customers.closedSales || 0,
        ],
      ],
    },
    {
      section: "Rentals",
      rows: [
        ["Total bookings", stats?.rentals.totalBookings || 0],
        ["Pending requests", stats?.rentals.pending || 0],
        ["Upcoming pickups", stats?.rentals.upcoming || 0],
        ["Out now", stats?.rentals.activeRentals || 0],
        ["Completed", stats?.rentals.completed || 0],
        ["Online / walk-in", `${stats?.rentals.online || 0} / ${stats?.rentals.walkIn || 0}`],
        ...(money ? [
          [`Rental income · ${report?.period.label}`, pkr(report?.rentals.revenue || 0)],
          ["All-time rental income", pkr(report?.rentals.revenueTotal || 0)],
          ["Deposits held", pkr(stats?.rentals.depositsHeld || 0)],
        ] : []),
      ],
    },
    {
      section: `Sales · ${report?.period.label ?? ""}`,
      rows: [
        ["Vehicles sold", report?.sales.count || 0],
        ...(money ? [["Sales value", pkr(report?.sales.value || 0)]] : []),
      ],
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, var(--gh-f8fafc) 0%, var(--gh-f6f8fa) 100%)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "var(--gh-0d1117)",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "rgb(var(--tw-c-white) / 0.95)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--gh-e1e4e8)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: "1150px",
            margin: "0 auto",
            padding: "16px clamp(16px, 4vw, 24px)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <Link
              href="/business/dashboard"
              style={{
                fontSize: "11px",
                color: "var(--gh-57606a)",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              ← Dashboard
            </Link>

            <h1
              style={{
                fontSize: "20px",
                fontWeight: 750,
                color: "var(--gh-0d1117)",
                margin: "5px 0 0",
                letterSpacing: "-0.3px",
              }}
            >
              Reports
            </h1>
          </div>

          {report && (
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--gh-8c959f)", whiteSpace: "nowrap" }}>
              {updating ? "Updating…" : "Period"}
              <select value={period} aria-label="Report period" onChange={e => { setUpdating(true); setPeriod(e.target.value as ReportPeriod); }}
                style={{ fontSize: "12px", fontWeight: 600, color: "var(--gh-0d1117)", background: "var(--gh-ffffff)", border: "1px solid var(--gh-e1e4e8)", padding: "7px 10px", borderRadius: "8px" }}>
                {REPORT_PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </label>
          )}
        </div>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "1150px",
          margin: "0 auto",
          // Room at the bottom so the floating "+ New" button never sits over the last table
          padding: "clamp(16px, 4vw, 28px) clamp(16px, 4vw, 24px) 96px",
          boxSizing: "border-box",
        }}
      >
        {/* KPI Section */}
        <section style={{ marginBottom: "24px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "end",
              marginBottom: "12px",
              gap: "12px",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "14px",
                  fontWeight: 750,
                  margin: 0,
                  color: "var(--gh-0d1117)",
                }}
              >
                Business overview
              </h2>

              <p
                style={{
                  fontSize: "11px",
                  color: "var(--gh-8c959f)",
                  margin: "3px 0 0",
                }}
              >
                Key performance indicators
              </p>
            </div>
          </div>

          {/* Six cards: 2, then 3, then 6 a row, so no row is left with a single card */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
            {kpis.map((s) => (
              <div
                key={s.label}
                style={{
                  background: "var(--gh-ffffff)",
                  border: "1px solid var(--gh-e1e4e8)",
                  borderRadius: "13px",
                  padding: "15px",
                  minWidth: 0,
                  boxShadow:
                    "0 3px 14px rgba(15,23,42,0.025)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "10px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "10px",
                      color: "var(--gh-8c959f)",
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {s.label}
                  </p>

                  <span
                    style={{
                      width: "30px",
                      height: "30px",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--gh-f6f8fa)",
                      border: "1px solid var(--gh-e1e4e8)",
                      borderRadius: "8px",
                      fontSize: "15px",
                    }}
                  >
                    <s.icon size={16} strokeWidth={1.75} />
                  </span>
                </div>

                <p
                  style={{
                    fontSize: "22px",
                    fontWeight: 800,
                    color: "var(--gh-0d1117)",
                    margin: "0 0 2px",
                    letterSpacing: "-0.5px",
                  }}
                >
                  {s.value}
                </p>

                <p
                  style={{
                    fontSize: "10px",
                    color: "var(--gh-8c959f)",
                    margin: 0,
                  }}
                >
                  {s.sub}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Charts */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          {/* Inventory breakdown */}
          <div
            style={{
              background: "var(--gh-ffffff)",
              border: "1px solid var(--gh-e1e4e8)",
              borderRadius: "14px",
              padding: "18px",
              minWidth: 0,
              boxShadow:
                "0 4px 16px rgba(15,23,42,0.025)",
            }}
          >
            <div style={{ marginBottom: "8px" }}>
              <h2
                style={{
                  fontSize: "14px",
                  fontWeight: 750,
                  color: "var(--gh-0d1117)",
                  margin: 0,
                }}
              >
                Inventory breakdown
              </h2>

              <p
                style={{
                  fontSize: "10px",
                  color: "var(--gh-8c959f)",
                  margin: "4px 0 0",
                }}
              >
                Current vehicle inventory status
              </p>
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={inventoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={82}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {inventoryData.map((entry, i) => (
                    <Cell
                      key={`inventory-${i}`}
                      fill={entry.color}
                    />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(v) => [`${v} vehicles`]}
                />
              </PieChart>
            </ResponsiveContainer>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "12px 18px",
                flexWrap: "wrap",
                marginTop: "4px",
              }}
            >
              {inventoryData.map((d) => (
                <div
                  key={d.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <div
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: d.color,
                    }}
                  />

                  <span
                    style={{
                      fontSize: "10px",
                      color: "var(--gh-57606a)",
                    }}
                  >
                    {d.name}: {d.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Customer pipeline */}
          <div
            style={{
              background: "var(--gh-ffffff)",
              border: "1px solid var(--gh-e1e4e8)",
              borderRadius: "14px",
              padding: "18px",
              minWidth: 0,
              boxShadow:
                "0 4px 16px rgba(15,23,42,0.025)",
            }}
          >
            <div style={{ marginBottom: "8px" }}>
              <h2
                style={{
                  fontSize: "14px",
                  fontWeight: 750,
                  color: "var(--gh-0d1117)",
                  margin: 0,
                }}
              >
                Customer pipeline
              </h2>

              <p
                style={{
                  fontSize: "10px",
                  color: "var(--gh-8c959f)",
                  margin: "4px 0 0",
                }}
              >
                Customer journey from lead to sale
              </p>
            </div>

            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={pipelineData}
                margin={{
                  top: 10,
                  right: 8,
                  left: -20,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chart.grid}
                />

                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: 10,
                    fill: chart.tick,
                  }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />

                <YAxis
                  tick={{
                    fontSize: 10,
                    fill: chart.tick,
                  }}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip />

                <Bar
                  dataKey="value"
                  fill={chart.ink}
                  radius={[5, 5, 0, 0]}
                  name="Customers"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Rental revenue */}
        <section
          style={{
            background: "var(--gh-ffffff)",
            border: "1px solid var(--gh-e1e4e8)",
            borderRadius: "14px",
            padding: "18px",
            marginBottom: "18px",
            boxShadow: "0 4px 16px rgba(15,23,42,0.025)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "8px" }}>
            <div>
              <h2 style={{ fontSize: "14px", fontWeight: 750, color: "var(--gh-0d1117)", margin: 0 }}>{money ? "Sales and rental income" : "Vehicles sold"}</h2>
              <p style={{ fontSize: "10px", color: "var(--gh-8c959f)", margin: "4px 0 0" }}>By month (Pakistan time), from the sale records and returned bookings</p>
            </div>
            {money && (
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "18px", fontWeight: 800, color: "var(--gh-0d1117)", margin: 0 }}>{pkr(report?.rentals.revenueTotal || 0)}</p>
                <p style={{ fontSize: "10px", color: "var(--gh-8c959f)", margin: "2px 0 0" }}>rental income, all time</p>
              </div>
            )}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={report?.byMonth || []} margin={{ top: 10, right: 8, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: chart.tick }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: chart.tick }} tickLine={false} axisLine={false} width={56} allowDecimals={false}
                tickFormatter={(v: number) => (money ? pkr(v).replace("PKR ", "") : String(v))} />
              <Tooltip formatter={(v, name) => [money ? pkr(Number(v)) : String(v), String(name)]} cursor={{ fill: chart.cursor }} />
              {money ? (
                <>
                  <Bar dataKey="salesValue" fill={salesColor} radius={[5, 5, 0, 0]} name="Sales" maxBarSize={32} />
                  <Bar dataKey="rentalRevenue" fill={chart.revenue} radius={[5, 5, 0, 0]} name="Rental income" maxBarSize={32} />
                </>
              ) : (
                <Bar dataKey="sales" fill={salesColor} radius={[5, 5, 0, 0]} name="Vehicles sold" maxBarSize={48} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* Business Summary */}
        <section
          style={{
            background: "var(--gh-ffffff)",
            border: "1px solid var(--gh-e1e4e8)",
            borderRadius: "14px",
            padding: "18px",
            boxShadow:
              "0 4px 16px rgba(15,23,42,0.025)",
          }}
        >
          <div style={{ marginBottom: "18px" }}>
            <h2
              style={{
                fontSize: "14px",
                fontWeight: 750,
                color: "var(--gh-0d1117)",
                margin: 0,
              }}
            >
              Business summary
            </h2>

            <p
              style={{
                fontSize: "10px",
                color: "var(--gh-8c959f)",
                margin: "4px 0 0",
              }}
            >
              Detailed performance overview
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
              gap: "20px",
            }}
          >
            {summaryColumns.map((col) => (
              <div
                key={col.section}
                style={{
                  minWidth: 0,
                  background: "var(--gh-fafbfc)",
                  border: "1px solid var(--gh-edf0f2)",
                  borderRadius: "11px",
                  padding: "14px",
                }}
              >
                <p
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    color: "var(--gh-0d1117)",
                    textTransform: "uppercase",
                    letterSpacing: "0.6px",
                    margin: "0 0 10px",
                  }}
                >
                  {col.section}
                </p>

                {col.rows.map(([label, value]) => (
                  <div
                    key={label as string}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      padding: "9px 0",
                      borderBottom:
                        "1px solid var(--gh-e9edf0)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--gh-57606a)",
                        minWidth: 0,
                      }}
                    >
                      {label}
                    </span>

                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 750,
                        color: "var(--gh-0d1117)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* Ultimate: any date range, per vehicle and team member, CSV (all money, so owner and managers only) */}
        {report?.canSeeMoney && <AdvancedReports />}
      </div>
    </div>
  );
}
