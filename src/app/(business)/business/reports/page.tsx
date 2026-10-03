"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

type Stats = {
  inventory: { totalVehicles: number; available: number; sold: number; reserved: number };
  customers: { totalCustomers: number; leads: number; testDrives: number; closedSales: number };
  rentals: { totalBookings: number; activeRentals: number };
  monthly: { sales: number; revenue: number };
};

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/business/stats")
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#57606a" }}>Loading reports...</p>
    </div>
  );

  const inventoryData = [
    { name: "Available", value: stats?.inventory.available || 0, color: "#1a7f37" },
    { name: "Sold", value: stats?.inventory.sold || 0, color: "#0550ae" },
    { name: "Reserved", value: stats?.inventory.reserved || 0, color: "#e3b341" },
  ];

  const pipelineData = [
    { name: "Leads", value: stats?.customers.leads || 0 },
    { name: "Interested", value: stats?.customers.totalCustomers || 0 },
    { name: "Test Drive", value: stats?.customers.testDrives || 0 },
    { name: "Closed", value: stats?.customers.closedSales || 0 },
  ];

  const conversionRate = stats?.customers.totalCustomers
    ? Math.round((stats.customers.closedSales / stats.customers.totalCustomers) * 100)
    : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

      {/* Header */}
      <div style={{ padding: "20px 24px", background: "white", borderBottom: "1px solid #e1e4e8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Link href="/business/dashboard" style={{ fontSize: "12px", color: "#57606a", textDecoration: "none" }}>← Dashboard</Link>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#0d1117", marginTop: "4px" }}>Reports</h1>
        </div>
        <div style={{ fontSize: "12px", color: "#8c959f" }}>
          {new Date().toLocaleDateString("en-PK", { month: "long", year: "numeric" })}
        </div>
      </div>

      <div style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto" }}>

        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "14px", marginBottom: "24px" }}>
          {[
            { label: "Total vehicles", value: stats?.inventory.totalVehicles || 0, icon: "🚗", sub: "in inventory" },
            { label: "Total customers", value: stats?.customers.totalCustomers || 0, icon: "👥", sub: "tracked" },
            { label: "Sales this month", value: stats?.monthly.sales || 0, icon: "💰", sub: `PKR ${((stats?.monthly.revenue || 0) / 1000000).toFixed(1)}M` },
            { label: "Conversion rate", value: `${conversionRate}%`, icon: "📈", sub: "leads to sales" },
            { label: "Active rentals", value: stats?.rentals.activeRentals || 0, icon: "🔑", sub: "ongoing" },
            { label: "Total bookings", value: stats?.rentals.totalBookings || 0, icon: "📅", sub: "all time" },
          ].map(s => (
            <div key={s.label} style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <p style={{ fontSize: "11px", color: "#8c959f" }}>{s.label}</p>
                <span style={{ fontSize: "18px" }}>{s.icon}</span>
              </div>
              <p style={{ fontSize: "22px", fontWeight: 800, color: "#0d1117", marginBottom: "2px" }}>{s.value}</p>
              <p style={{ fontSize: "11px", color: "#8c959f" }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>

          {/* Inventory breakdown — Pie */}
          <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "20px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0d1117", marginBottom: "16px" }}>Inventory breakdown</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={inventoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {inventoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v} vehicles`]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "8px" }}>
              {inventoryData.map(d => (
                <div key={d.name} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: d.color }} />
                  <span style={{ fontSize: "11px", color: "#57606a" }}>{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Customer pipeline — Bar */}
          <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "20px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0d1117", marginBottom: "16px" }}>Customer pipeline</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pipelineData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8c959f" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#8c959f" }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#0d1117" radius={[4, 4, 0, 0]} name="Customers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary table */}
        <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "20px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0d1117", marginBottom: "16px" }}>Business summary</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0" }}>
            {[
              { section: "Inventory", rows: [
                ["Total vehicles", stats?.inventory.totalVehicles || 0],
                ["Available for sale", stats?.inventory.available || 0],
                ["Sold vehicles", stats?.inventory.sold || 0],
                ["Reserved / pending", stats?.inventory.reserved || 0],
              ]},
              { section: "Customers", rows: [
                ["Total customers", stats?.customers.totalCustomers || 0],
                ["New leads", stats?.customers.leads || 0],
                ["Test drives scheduled", stats?.customers.testDrives || 0],
                ["Deals closed", stats?.customers.closedSales || 0],
              ]},
              { section: "Rentals", rows: [
                ["Total bookings", stats?.rentals.totalBookings || 0],
                ["Currently active", stats?.rentals.activeRentals || 0],
                ["Monthly revenue", `PKR ${((stats?.monthly.revenue || 0) / 1000).toFixed(0)}K`],
                ["Monthly sales", stats?.monthly.sales || 0],
              ]},
            ].map((col, ci) => (
              <div key={col.section} style={{ borderRight: ci < 2 ? "1px solid #e1e4e8" : "none", paddingRight: ci < 2 ? "20px" : "0", paddingLeft: ci > 0 ? "20px" : "0" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "#0d1117", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>{col.section}</p>
                {col.rows.map(([label, value]) => (
                  <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f6f8fa" }}>
                    <span style={{ fontSize: "12px", color: "#57606a" }}>{label}</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#0d1117" }}>{value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
