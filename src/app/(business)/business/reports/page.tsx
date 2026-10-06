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
import { Calendar, Car, KeyRound, TrendingUp, Users, Wallet } from "lucide-react";

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
  };
  monthly: {
    sales: number;
    revenue: number;
  };
};

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/business/stats")
      .then((r) => r.json())
      .then((d) => {
        setStats(d);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f6f8fa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e1e4e8",
            borderRadius: "14px",
            padding: "22px 28px",
            boxShadow: "0 8px 25px rgba(15,23,42,0.05)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#57606a",
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

  const inventoryData = [
    {
      name: "Available",
      value: stats?.inventory.available || 0,
      color: "#1a7f37",
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
      label: "Sales this month",
      value: stats?.monthly.sales || 0,
      icon: Wallet,
      sub: `PKR ${((stats?.monthly.revenue || 0) / 1000000).toFixed(
        1
      )}M`,
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
      sub: "ongoing",
    },
    {
      label: "Total bookings",
      value: stats?.rentals.totalBookings || 0,
      icon: Calendar,
      sub: "all time",
    },
  ];

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
        [
          "Total bookings",
          stats?.rentals.totalBookings || 0,
        ],
        [
          "Currently active",
          stats?.rentals.activeRentals || 0,
        ],
        [
          "Monthly revenue",
          `PKR ${((stats?.monthly.revenue || 0) / 1000).toFixed(
            0
          )}K`,
        ],
        [
          "Monthly sales",
          stats?.monthly.sales || 0,
        ],
      ],
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f8fafc 0%, #f6f8fa 100%)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#0d1117",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid #e1e4e8",
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
                color: "#57606a",
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
                color: "#0d1117",
                margin: "5px 0 0",
                letterSpacing: "-0.3px",
              }}
            >
              Reports
            </h1>
          </div>

          <div
            style={{
              fontSize: "11px",
              color: "#8c959f",
              whiteSpace: "nowrap",
              background: "#f6f8fa",
              border: "1px solid #e1e4e8",
              padding: "7px 10px",
              borderRadius: "8px",
            }}
          >
            {new Date().toLocaleDateString("en-PK", {
              month: "long",
              year: "numeric",
            })}
          </div>
        </div>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "1150px",
          margin: "0 auto",
          padding: "clamp(16px, 4vw, 28px) clamp(16px, 4vw, 24px) 40px",
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
                  color: "#0d1117",
                }}
              >
                Business overview
              </h2>

              <p
                style={{
                  fontSize: "11px",
                  color: "#8c959f",
                  margin: "3px 0 0",
                }}
              >
                Key performance indicators
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
              gap: "12px",
            }}
          >
            {kpis.map((s) => (
              <div
                key={s.label}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e1e4e8",
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
                      color: "#8c959f",
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
                      background: "#f6f8fa",
                      border: "1px solid #e1e4e8",
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
                    color: "#0d1117",
                    margin: "0 0 2px",
                    letterSpacing: "-0.5px",
                  }}
                >
                  {s.value}
                </p>

                <p
                  style={{
                    fontSize: "10px",
                    color: "#8c959f",
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
              background: "#ffffff",
              border: "1px solid #e1e4e8",
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
                  color: "#0d1117",
                  margin: 0,
                }}
              >
                Inventory breakdown
              </h2>

              <p
                style={{
                  fontSize: "10px",
                  color: "#8c959f",
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
                      color: "#57606a",
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
              background: "#ffffff",
              border: "1px solid #e1e4e8",
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
                  color: "#0d1117",
                  margin: 0,
                }}
              >
                Customer pipeline
              </h2>

              <p
                style={{
                  fontSize: "10px",
                  color: "#8c959f",
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
                  stroke="#f0f0f0"
                />

                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: 10,
                    fill: "#8c959f",
                  }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />

                <YAxis
                  tick={{
                    fontSize: 10,
                    fill: "#8c959f",
                  }}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip />

                <Bar
                  dataKey="value"
                  fill="#0d1117"
                  radius={[5, 5, 0, 0]}
                  name="Customers"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Business Summary */}
        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e1e4e8",
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
                color: "#0d1117",
                margin: 0,
              }}
            >
              Business summary
            </h2>

            <p
              style={{
                fontSize: "10px",
                color: "#8c959f",
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
                  background: "#fafbfc",
                  border: "1px solid #edf0f2",
                  borderRadius: "11px",
                  padding: "14px",
                }}
              >
                <p
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    color: "#0d1117",
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
                        "1px solid #e9edf0",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#57606a",
                        minWidth: 0,
                      }}
                    >
                      {label}
                    </span>

                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 750,
                        color: "#0d1117",
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
      </div>
    </div>
  );
}