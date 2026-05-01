"use client";

import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area,} from "recharts";
import Link from "next/link";

type DailyData = {
  date: string;
  users: number;
  listings: number;
  bookings: number;
  messages: number;
};

type WeeklyData = {
  date: string;
  fullDate: string;
  users: number;
  listings: number;
  bookings: number;
};

type MonthlyData = {
  date: string;
  users: number;
  listings: number;
  bookings: number;
  revenue: number;
};

type Summary = {
  newUsersThisMonth: number;
  newListingsThisMonth: number;
  newBookingsThisMonth: number;
  totalMessages: number;
};

type Period = "daily" | "weekly" | "monthly";

const COLORS = {
  users: "#0550ae",
  listings: "#1a7f37",
  bookings: "#7d4e00",
  messages: "#6e40c9",
  revenue: "#cf222e",
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("daily");
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then(r => r.json())
      .then(d => {
        setDailyData(d.dailyData || []);
        setWeeklyData(d.weeklyData || []);
        setMonthlyData(d.monthlyData || []);
        setSummary(d.summary);
        setLoading(false);
      });
  }, []);

  const currentData = period === "daily" ? dailyData : period === "weekly" ? weeklyData : monthlyData;

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "8px", padding: "12px 16px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
        <p style={{ fontSize: "12px", fontWeight: 600, color: "#0d1117", marginBottom: "8px" }}>{label}</p>
        {payload.map(entry => (
          <div key={entry.name} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: entry.color }} />
            <span style={{ fontSize: "12px", color: "#57606a", textTransform: "capitalize" }}>{entry.name}:</span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#0d1117" }}>
              {entry.name === "revenue" ? `PKR ${entry.value.toLocaleString()}` : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <Link href="/admin" style={{ fontSize: "13px", color: "#57606a", textDecoration: "none" }}>← Admin</Link>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0d1117", marginTop: "8px" }}>Analytics</h1>
            <p style={{ fontSize: "13px", color: "#57606a" }}>Platform activity and growth metrics</p>
          </div>

          {/* Period selector */}
          <div style={{ display: "flex", gap: "4px", background: "white", border: "1px solid #e1e4e8", borderRadius: "10px", padding: "4px" }}>
            {(["daily", "weekly", "monthly"] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                style={{ padding: "7px 16px", borderRadius: "7px", border: "none", fontSize: "13px", fontWeight: 500, cursor: "pointer", background: period === p ? "#0d1117" : "transparent", color: period === p ? "white" : "#57606a", textTransform: "capitalize" }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", height: "300px", opacity: 0.4 }} />
            ))}
          </div>
        ) : (
          <>
            {/* Summary cards */}
            {summary && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
                {[
                  { label: "New users (30d)", value: summary.newUsersThisMonth, icon: "👥", color: COLORS.users },
                  { label: "New listings (30d)", value: summary.newListingsThisMonth, icon: "🚗", color: COLORS.listings },
                  { label: "New bookings (30d)", value: summary.newBookingsThisMonth, icon: "📅", color: COLORS.bookings },
                  { label: "Total messages", value: summary.totalMessages, icon: "💬", color: COLORS.messages },
                ].map(card => (
                  <div key={card.label} style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#f6f8fa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
                      {card.icon}
                    </div>
                    <div>
                      <p style={{ fontSize: "11px", color: "#8c959f", marginBottom: "2px" }}>{card.label}</p>
                      <p style={{ fontSize: "22px", fontWeight: 700, color: card.color }}>{card.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Chart 1 — User & Listing growth */}
            <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#0d1117", marginBottom: "4px" }}>User & listing growth</h2>
              <p style={{ fontSize: "12px", color: "#8c959f", marginBottom: "20px" }}>
                {period === "daily" ? "Last 30 days" : period === "weekly" ? "Last 12 weeks" : "Last 12 months"}
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={currentData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.users} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={COLORS.users} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="listingsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.listings} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={COLORS.listings} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8c959f" }} tickLine={false} axisLine={false} interval={period === "daily" ? 4 : 0} />
                  <YAxis tick={{ fontSize: 11, fill: "#8c959f" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                  <Area type="monotone" dataKey="users" stroke={COLORS.users} strokeWidth={2} fill="url(#usersGrad)" dot={false} />
                  <Area type="monotone" dataKey="listings" stroke={COLORS.listings} strokeWidth={2} fill="url(#listingsGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 2 — Bookings */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "20px" }}>
                <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#0d1117", marginBottom: "4px" }}>Booking activity</h2>
                <p style={{ fontSize: "12px", color: "#8c959f", marginBottom: "20px" }}>Number of bookings per period</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={currentData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8c959f" }} tickLine={false} axisLine={false} interval={period === "daily" ? 6 : 0} />
                    <YAxis tick={{ fontSize: 10, fill: "#8c959f" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="bookings" fill={COLORS.bookings} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 3 — Messages */}
              <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "20px" }}>
                <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#0d1117", marginBottom: "4px" }}>
                  {period === "monthly" ? "Monthly revenue (PKR)" : "Daily messages"}
                </h2>
                <p style={{ fontSize: "12px", color: "#8c959f", marginBottom: "20px" }}>
                  {period === "monthly" ? "Completed rental revenue" : "Chat messages sent per day"}
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={currentData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8c959f" }} tickLine={false} axisLine={false} interval={period === "daily" ? 6 : 0} />
                    <YAxis tick={{ fontSize: 10, fill: "#8c959f" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey={period === "monthly" ? "revenue" : "messages"} fill={period === "monthly" ? COLORS.revenue : COLORS.messages} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4 — All metrics line chart */}
            <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "20px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#0d1117", marginBottom: "4px" }}>All metrics overview</h2>
              <p style={{ fontSize: "12px", color: "#8c959f", marginBottom: "20px" }}>Users, listings and bookings combined</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={currentData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8c959f" }} tickLine={false} axisLine={false} interval={period === "daily" ? 4 : 0} />
                  <YAxis tick={{ fontSize: 11, fill: "#8c959f" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                  <Line type="monotone" dataKey="users" stroke={COLORS.users} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="listings" stroke={COLORS.listings} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="bookings" stroke={COLORS.bookings} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
