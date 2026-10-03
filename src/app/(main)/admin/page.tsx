"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Stats = {
  totalUsers: number;
  totalListings: number;
  activeListings: number;
  totalBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  totalRevenue: number;
  platformFee: number;
};

type RecentUser = { _id: string; name: string; email: string; role: string; createdAt: string };
type RecentListing = { _id: string; title: string; make: string; model: string; year: number; price: number; status: string };
type Organization = {
  _id: string;
  name: string;
  type: string;
  plan: string;
  city: string;
  isActive: boolean;
  staffCount: number;
  vehicleCount: number;
  createdAt: string;
  ownerId: { _id: string; name?: string; email: string };
};

const PLAN_COLORS: Record<string, { bg: string; color: string }> = {
  FREE:     { bg: "#f6f8fa", color: "#57606a" },
  PRO:      { bg: "#ddf4ff", color: "#0550ae" },
  BUSINESS: { bg: "#dafbe1", color: "#1a7f37" },
};

function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(id); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      title="Copy ID"
      style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "2px 6px", background: copied ? "#dafbe1" : "#f6f8fa", border: `1px solid ${copied ? "#56d364" : "#d0d7de"}`, borderRadius: "4px", fontSize: "10px", color: copied ? "#1a7f37" : "#8c959f", cursor: "pointer", fontFamily: "monospace", transition: "all 0.15s" }}>
      {copied ? "✓" : "ID"} {id.slice(-6)}
    </button>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentListings, setRecentListings] = useState<RecentListing[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "businesses">("overview");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then(r => r.json()),
      fetch("/api/admin/organizations").then(r => r.json()),
    ]).then(([statsData, orgData]) => {
      setStats(statsData.stats);
      setRecentUsers(statsData.recentUsers || []);
      setRecentListings(statsData.recentListings || []);
      setOrganizations(orgData.organizations || []);
      setLoading(false);
    });
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", padding: "28px 24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0d1117" }}>Admin Dashboard</h1>
            <p style={{ fontSize: "13px", color: "#57606a" }}>AutoMarket platform management</p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[
              { href: "/admin/users", label: "👥 Users" },
              { href: "/admin/listings", label: "🚗 Listings" },
              { href: "/admin/bookings", label: "📅 Bookings" },
              { href: "/admin/analytics", label: "📊 Analytics" },
            ].map(btn => (
              <Link key={btn.href} href={btn.href}
                style={{ padding: "8px 14px", background: "white", border: "1px solid #e1e4e8", borderRadius: "8px", fontSize: "13px", color: "#0d1117", textDecoration: "none", fontWeight: 500 }}>
                {btn.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", background: "white", border: "1px solid #e1e4e8", borderRadius: "10px", padding: "4px", marginBottom: "20px", width: "fit-content" }}>
          {(["overview", "businesses"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: "7px 20px", borderRadius: "7px", border: "none", fontSize: "13px", fontWeight: 500, cursor: "pointer", background: activeTab === tab ? "#0d1117" : "transparent", color: activeTab === tab ? "white" : "#57606a", fontFamily: "inherit", textTransform: "capitalize" }}>
              {tab === "overview" ? "Overview" : `Businesses (${organizations.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {[1,2,3,4,5,6].map(i => <div key={i} style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", height: "90px", opacity: 0.4 }} />)}
          </div>
        ) : activeTab === "overview" ? (
          <>
            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "14px", marginBottom: "24px" }}>
              {stats && [
                { label: "Total users", value: stats.totalUsers, icon: "👥", color: "#0550ae" },
                { label: "Total listings", value: stats.totalListings, icon: "🚗", color: "#1a7f37" },
                { label: "Active listings", value: stats.activeListings, icon: "✅", color: "#7d4e00" },
                { label: "Total bookings", value: stats.totalBookings, icon: "📅", color: "#6e40c9" },
                { label: "Completed", value: stats.completedBookings, icon: "🏁", color: "#57606a" },
                { label: "Platform fee", value: `PKR ${(stats.platformFee / 1000).toFixed(0)}K`, icon: "💰", color: "#1a7f37" },
              ].map(card => (
                <div key={card.label} style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#f6f8fa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
                    {card.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: "11px", color: "#8c959f", marginBottom: "2px" }}>{card.label}</p>
                    <p style={{ fontSize: "20px", fontWeight: 700, color: card.color }}>{card.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent users + listings */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

              {/* Recent users */}
              <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #e1e4e8", display: "flex", justifyContent: "space-between" }}>
                  <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#0d1117" }}>Recent users</h2>
                  <Link href="/admin/users" style={{ fontSize: "12px", color: "#57606a", textDecoration: "none" }}>View all →</Link>
                </div>
                {recentUsers.map((user, i) => (
                  <div key={user._id} style={{ padding: "11px 20px", borderBottom: i < recentUsers.length - 1 ? "1px solid #f6f8fa" : "none", display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#0d1117", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, flexShrink: 0 }}>
                      {user.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "1px" }}>
                        <p style={{ fontSize: "12px", fontWeight: 600, color: "#0d1117" }}>{user.name}</p>
                        <CopyId id={user._id} />
                      </div>
                      <p style={{ fontSize: "11px", color: "#8c959f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
                    </div>
                    <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "20px", background: user.role === "ADMIN" ? "#fff8c5" : "#f6f8fa", color: user.role === "ADMIN" ? "#7d4e00" : "#57606a", flexShrink: 0 }}>
                      {user.role}
                    </span>
                  </div>
                ))}
              </div>

              {/* Recent listings */}
              <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #e1e4e8", display: "flex", justifyContent: "space-between" }}>
                  <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#0d1117" }}>Recent listings</h2>
                  <Link href="/admin/listings" style={{ fontSize: "12px", color: "#57606a", textDecoration: "none" }}>View all →</Link>
                </div>
                {recentListings.map((listing, i) => (
                  <div key={listing._id} style={{ padding: "11px 20px", borderBottom: i < recentListings.length - 1 ? "1px solid #f6f8fa" : "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "1px" }}>
                        <p style={{ fontSize: "12px", fontWeight: 600, color: "#0d1117", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{listing.title}</p>
                        <CopyId id={listing._id} />
                      </div>
                      <p style={{ fontSize: "11px", color: "#8c959f" }}>{listing.make} {listing.model} · PKR {listing.price.toLocaleString()}</p>
                    </div>
                    <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "20px", background: listing.status === "ACTIVE" ? "#dafbe1" : "#fff0f0", color: listing.status === "ACTIVE" ? "#1a7f37" : "#cf222e", flexShrink: 0 }}>
                      {listing.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* BUSINESSES TAB */
          <div>
            {/* Business stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
              {[
                { label: "Total businesses", value: organizations.length, color: "#0d1117" },
                { label: "Active", value: organizations.filter(o => o.isActive).length, color: "#1a7f37" },
                { label: "Pro plan", value: organizations.filter(o => o.plan === "PRO").length, color: "#0550ae" },
                { label: "Business plan", value: organizations.filter(o => o.plan === "BUSINESS").length, color: "#7d4e00" },
                { label: "Dealers", value: organizations.filter(o => o.type === "DEALER" || o.type === "BOTH").length, color: "#6e40c9" },
                { label: "Rental co.", value: organizations.filter(o => o.type === "RENTAL" || o.type === "BOTH").length, color: "#57606a" },
              ].map(s => (
                <div key={s.label} style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "10px", padding: "14px 16px" }}>
                  <p style={{ fontSize: "11px", color: "#8c959f", marginBottom: "4px" }}>{s.label}</p>
                  <p style={{ fontSize: "22px", fontWeight: 800, color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Businesses table */}
            <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #e1e4e8", background: "#f6f8fa", display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 1fr", gap: "12px" }}>
                {["Business", "Owner", "Type", "Plan", "Vehicles", "Staff"].map(h => (
                  <p key={h} style={{ fontSize: "11px", fontWeight: 600, color: "#57606a", textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</p>
                ))}
              </div>
              {organizations.length === 0 ? (
                <div style={{ padding: "48px", textAlign: "center", color: "#57606a" }}>No businesses registered yet</div>
              ) : organizations.map((org, i) => {
                const planStyle = PLAN_COLORS[org.plan] || PLAN_COLORS.FREE;
                return (
                  <div key={org._id} style={{ padding: "13px 20px", borderBottom: i < organizations.length - 1 ? "1px solid #f6f8fa" : "none", display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 1fr", gap: "12px", alignItems: "center" }}>
                    {/* Business name + ID */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                        <div style={{ width: "24px", height: "24px", borderRadius: "5px", background: "linear-gradient(135deg,#3b82f6,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 800, color: "white", flexShrink: 0 }}>
                          {org.name[0]}
                        </div>
                        <p style={{ fontSize: "12px", fontWeight: 600, color: "#0d1117", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{org.name}</p>
                      </div>
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        <CopyId id={org._id} />
                        <span style={{ fontSize: "10px", color: "#8c959f" }}>{org.city}</span>
                      </div>
                    </div>

                    {/* Owner + ID */}
                    <div>
                      <p style={{ fontSize: "12px", color: "#0d1117", marginBottom: "2px" }}>{org.ownerId?.name || "Unknown"}</p>
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        <CopyId id={org.ownerId?._id} />
                        <p style={{ fontSize: "10px", color: "#8c959f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{org.ownerId?.email}</p>
                      </div>
                    </div>

                    <span style={{ fontSize: "11px", color: "#57606a", fontWeight: 500 }}>{org.type}</span>

                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: planStyle.bg, color: planStyle.color, width: "fit-content" }}>
                      {org.plan}
                    </span>

                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#0d1117" }}>{org.vehicleCount}</p>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#0d1117" }}>{org.staffCount}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
