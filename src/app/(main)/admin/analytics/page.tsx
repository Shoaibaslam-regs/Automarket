 "use client";

import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area,
} from "recharts";
import Link from "next/link";
import Footer from "@/components/Footer";

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
  const [width, setWidth] = useState(1200);

  const [dailyData, setDailyData] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setWidth(window.innerWidth);
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  const isMobile = width < 640;
  const isTablet = width < 1024;

  const currentData =
    period === "daily"
      ? dailyData
      : period === "weekly"
      ? weeklyData
      : monthlyData;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f6f8fa",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      padding: isMobile ? "16px" : "32px 24px"
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* HEADER (UNCHANGED) */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "28px",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          <div>
            <Link href="/admin" style={{ fontSize: "13px", color: "#57606a", textDecoration: "none" }}>
              ← Admin
            </Link>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0d1117", marginTop: "8px" }}>
              Analytics
            </h1>
            <p style={{ fontSize: "13px", color: "#57606a" }}>
              Platform activity and growth metrics
            </p>
          </div>

          {/* PERIOD (UNCHANGED) */}
          <div style={{
            display: "flex",
            gap: "4px",
            background: "white",
            border: "1px solid #e1e4e8",
            borderRadius: "10px",
            padding: "4px",
            flexWrap: "wrap"
          }}>
            {(["daily", "weekly", "monthly"] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: "7px 16px",
                  borderRadius: "7px",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  background: period === p ? "#0d1117" : "transparent",
                  color: period === p ? "white" : "#57606a",
                  textTransform: "capitalize"
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* SUMMARY (ONLY RESPONSIVE GRID FIX) */}
        {summary && (
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : isTablet
              ? "repeat(2, 1fr)"
              : "repeat(4, 1fr)",
            gap: "16px",
            marginBottom: "28px"
          }}>
            {[
              { label: "New users (30d)", value: summary.newUsersThisMonth, icon: "👥", color: COLORS.users },
              { label: "New listings (30d)", value: summary.newListingsThisMonth, icon: "🚗", color: COLORS.listings },
              { label: "New bookings (30d)", value: summary.newBookingsThisMonth, icon: "📅", color: COLORS.bookings },
              { label: "Total messages", value: summary.totalMessages, icon: "💬", color: COLORS.messages },
            ].map(card => (
              <div key={card.label} style={{
                background: "white",
                border: "1px solid #e1e4e8",
                borderRadius: "12px",
                padding: "16px 18px",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "#f6f8fa",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px"
                }}>
                  {card.icon}
                </div>

                <div>
                  <p style={{ fontSize: "11px", color: "#8c959f" }}>{card.label}</p>
                  <p style={{ fontSize: "22px", fontWeight: 700, color: card.color }}>
                    {card.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CHART 1 (ONLY HEIGHT RESPONSIVE) */}
        <div style={{
          background: "white",
          border: "1px solid #e1e4e8",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "20px"
        }}>
          <h2 style={{ fontSize: "14px", fontWeight: 600 }}>User & listing growth</h2>

          <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
            <AreaChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area dataKey="users" stroke={COLORS.users} fill={COLORS.users} />
              <Area dataKey="listings" stroke={COLORS.listings} fill={COLORS.listings} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* CHART GRID (ONLY RESPONSIVE FIX) */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: "20px",
          marginBottom: "20px"
        }}>

          <div style={{
            background: "white",
            border: "1px solid #e1e4e8",
            borderRadius: "12px",
            padding: "20px"
          }}>
            <h2 style={{ fontSize: "14px", fontWeight: 600 }}>Booking activity</h2>
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 220}>
              <BarChart data={currentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="bookings" fill={COLORS.bookings} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{
            background: "white",
            border: "1px solid #e1e4e8",
            borderRadius: "12px",
            padding: "20px"
          }}>
            <h2 style={{ fontSize: "14px", fontWeight: 600 }}>
              {period === "monthly" ? "Monthly revenue" : "Daily messages"}
            </h2>

            <ResponsiveContainer width="100%" height={isMobile ? 200 : 220}>
              <BarChart data={currentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar
                  dataKey={period === "monthly" ? "revenue" : "messages"}
                  fill={period === "monthly" ? COLORS.revenue : COLORS.messages}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* FINAL CHART (ONLY HEIGHT FIX) */}
        <div style={{
          background: "white",
          border: "1px solid #e1e4e8",
          borderRadius: "12px",
          padding: "20px"
        }}>
          <h2 style={{ fontSize: "14px", fontWeight: 600 }}>All metrics overview</h2>

          <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
            <LineChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="users" stroke={COLORS.users} />
              <Line type="monotone" dataKey="listings" stroke={COLORS.listings} />
              <Line type="monotone" dataKey="bookings" stroke={COLORS.bookings} />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>
      <Footer/>
    </div>
  );
}