"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Stats = {
  inventory: { totalVehicles: number; available: number; sold: number; reserved: number };
  customers: { totalCustomers: number; leads: number; testDrives: number; closedSales: number };
  rentals: { totalBookings: number; activeRentals: number };
  monthly: { sales: number; revenue: number };
};

export default function BusinessDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/business/stats").then(r => r.json()),
      fetch("/api/business/organizations").then(r => r.json()),
    ]).then(([statsData, orgData]) => {
      if (!orgData.organization) { router.push("/business/onboarding"); return; }
      setStats(statsData);
      setLoading(false);
    });
  }, [router]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <p style={{ color: "#57606a", fontSize: "14px" }}>Loading dashboard...</p>
    </div>
  );

  return (
    <div>
      {/* Top bar */}
      <div style={{ padding: "16px 24px", background: "white", borderBottom: "1px solid #e1e4e8", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <div>
          <h1 style={{ fontSize: "17px", fontWeight: 700, color: "#0d1117" }}>Dashboard</h1>
          <p style={{ fontSize: "12px", color: "#8c959f" }}>
            {new Date().toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Link href="/sell" style={{ padding: "8px 16px", background: "#0d1117", color: "white", borderRadius: "8px", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
            + Add vehicle
          </Link>
        </div>
      </div>

      <div style={{ padding: "20px 24px" }}>

        {/* Main KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px", marginBottom: "20px" }}>
          {[
            { label: "Total vehicles", value: stats?.inventory.totalVehicles || 0, icon: "🚗", sub: `${stats?.inventory.available || 0} available`, color: "#0550ae", href: "/business/inventory" },
            { label: "Active customers", value: stats?.customers.totalCustomers || 0, icon: "👥", sub: `${stats?.customers.leads || 0} new leads`, color: "#1a7f37", href: "/business/customers" },
            { label: "Monthly sales", value: stats?.monthly.sales || 0, icon: "💰", sub: `PKR ${((stats?.monthly.revenue || 0) / 1000000).toFixed(1)}M revenue`, color: "#7d4e00", href: "/business/reports" },
            { label: "Active rentals", value: stats?.rentals.activeRentals || 0, icon: "🔑", sub: `${stats?.rentals.totalBookings || 0} total bookings`, color: "#6e40c9", href: "/business/rentals" },
          ].map(s => (
            <Link key={s.label} href={s.href} style={{ textDecoration: "none" }}>
              <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "18px 20px", cursor: "pointer", transition: "box-shadow 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                  <p style={{ fontSize: "12px", color: "#8c959f" }}>{s.label}</p>
                  <span style={{ fontSize: "20px" }}>{s.icon}</span>
                </div>
                <p style={{ fontSize: "28px", fontWeight: 800, color: s.color, marginBottom: "4px" }}>{s.value}</p>
                <p style={{ fontSize: "11px", color: "#8c959f" }}>{s.sub}</p>
              </div>
            </Link>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>

          {/* Inventory status */}
          <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0d1117" }}>Inventory status</h2>
              <Link href="/business/inventory" style={{ fontSize: "12px", color: "#57606a", textDecoration: "none" }}>View all →</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Available", value: stats?.inventory.available || 0, total: stats?.inventory.totalVehicles || 1, color: "#1a7f37" },
                { label: "Sold", value: stats?.inventory.sold || 0, total: stats?.inventory.totalVehicles || 1, color: "#0550ae" },
                { label: "Reserved", value: stats?.inventory.reserved || 0, total: stats?.inventory.totalVehicles || 1, color: "#e3b341" },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "5px" }}>
                    <span style={{ color: "#57606a" }}>{item.label}</span>
                    <span style={{ fontWeight: 700, color: "#0d1117" }}>{item.value} / {stats?.inventory.totalVehicles || 0}</span>
                  </div>
                  <div style={{ background: "#f6f8fa", borderRadius: "4px", height: "7px", overflow: "hidden" }}>
                    <div style={{ width: `${Math.round((item.value / (item.total || 1)) * 100)}%`, height: "100%", background: item.color, borderRadius: "4px", transition: "width 0.5s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer pipeline */}
          <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0d1117" }}>Customer pipeline</h2>
              <Link href="/business/customers" style={{ fontSize: "12px", color: "#57606a", textDecoration: "none" }}>View all →</Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                { label: "Leads", value: stats?.customers.leads || 0, color: "#57606a", bg: "#f6f8fa" },
                { label: "Interested", value: stats?.customers.totalCustomers || 0, color: "#0550ae", bg: "#ddf4ff" },
                { label: "Test drives", value: stats?.customers.testDrives || 0, color: "#7d4e00", bg: "#fff8c5" },
                { label: "Closed deals", value: stats?.customers.closedSales || 0, color: "#1a7f37", bg: "#dafbe1" },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                  <p style={{ fontSize: "22px", fontWeight: 800, color: s.color }}>{s.value}</p>
                  <p style={{ fontSize: "10px", color: s.color, marginTop: "2px", fontWeight: 500 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "20px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0d1117", marginBottom: "14px" }}>Quick actions</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "10px" }}>
            {[
              { href: "/sell", label: "Add vehicle", icon: "🚗", desc: "List a new vehicle" },
              { href: "/business/customers", label: "Add customer", icon: "👤", desc: "Log new inquiry" },
              { href: "/business/inventory", label: "View inventory", icon: "📋", desc: "Manage vehicles" },
              { href: "/business/reports", label: "View reports", icon: "📊", desc: "Stats & analytics" },
              { href: "/listings", label: "Marketplace", icon: "🌐", desc: "Browse listings" },
              { href: "/business/staff", label: "Manage staff", icon: "👥", desc: "Team members" },
            ].map(a => (
              <Link key={a.href} href={a.href}
                style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "14px", background: "#f6f8fa", border: "1px solid #e1e4e8", borderRadius: "10px", textDecoration: "none", transition: "all 0.12s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#0d1117"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#e1e4e8"; }}>
                <span style={{ fontSize: "22px" }}>{a.icon}</span>
                <p style={{ fontSize: "12px", fontWeight: 700, color: "#0d1117" }}>{a.label}</p>
                <p style={{ fontSize: "11px", color: "#8c959f" }}>{a.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
