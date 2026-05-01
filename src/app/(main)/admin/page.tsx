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
type RecentListing = { _id: string; title: string; make: string; model: string; year: number; price: number; status: string; createdAt: string };

export default function AdminPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
    const [recentListings, setRecentListings] = useState<RecentListing[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/admin/stats")
            .then(r => r.json())
            .then(d => {
                setStats(d.stats);
                setRecentUsers(d.recentUsers || []);
                setRecentListings(d.recentListings || []);
                setLoading(false);
            });
    }, []);

    const statCards = stats ? [
        { label: "Total users", value: stats.totalUsers, icon: "👥", color: "#0550ae" },
        { label: "Total listings", value: stats.totalListings, icon: "🚗", color: "#1a7f37" },
        { label: "Active listings", value: stats.activeListings, icon: "✅", color: "#7d4e00" },
        { label: "Total bookings", value: stats.totalBookings, icon: "📅", color: "#6e40c9" },
        { label: "Completed", value: stats.completedBookings, icon: "🏁", color: "#57606a" },
        { label: "Platform fee earned", value: `PKR ${stats.platformFee.toLocaleString()}`, icon: "💰", color: "#1a7f37" },
    ] : [];

    return (
        <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", padding: "32px 24px" }}>
            <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
                    <div>
                        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0d1117", marginBottom: "4px" }}>Admin Dashboard</h1>
                        <p style={{ fontSize: "13px", color: "#57606a" }}>Overview of AutoMarket platform</p>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <Link href="/admin/users" style={{ padding: "8px 14px", background: "white", border: "1px solid #e1e4e8", borderRadius: "8px", fontSize: "13px", color: "#0d1117", textDecoration: "none", fontWeight: 500 }}>
                            👥 Users
                        </Link>
                        <Link href="/admin/listings" style={{ padding: "8px 14px", background: "white", border: "1px solid #e1e4e8", borderRadius: "8px", fontSize: "13px", color: "#0d1117", textDecoration: "none", fontWeight: 500 }}>
                            🚗 Listings
                        </Link>
                        <Link href="/admin/analytics" style={{ padding: "8px 14px", background: "white", border: "1px solid #e1e4e8", borderRadius: "8px", fontSize: "13px", color: "#0d1117", textDecoration: "none", fontWeight: 500 }}>
                           📊 Analytics
                        </Link>
                        <Link href="/admin/bookings" style={{ padding: "8px 14px", background: "#0d1117", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", textDecoration: "none", fontWeight: 500 }}>
                            📅 Bookings
                        </Link> 
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", height: "90px", opacity: 0.4 }} />
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Stats grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" }}>
                            {statCards.map(card => (
                                <div key={card.label} style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
                                    <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "#f6f8fa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>
                                        {card.icon}
                                    </div>
                                    <div>
                                        <p style={{ fontSize: "11px", color: "#8c959f", marginBottom: "2px" }}>{card.label}</p>
                                        <p style={{ fontSize: "20px", fontWeight: 700, color: card.color }}>{card.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Two column */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

                            {/* Recent users */}
                            <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", overflow: "hidden" }}>
                                <div style={{ padding: "16px 20px", borderBottom: "1px solid #e1e4e8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#0d1117" }}>Recent users</h2>
                                    <Link href="/admin/users" style={{ fontSize: "12px", color: "#57606a", textDecoration: "none" }}>View all →</Link>
                                </div>
                                <div style={{ divide: "y" }}>
                                    {recentUsers.map(user => (
                                        <div key={user._id} style={{ padding: "12px 20px", borderBottom: "1px solid #f6f8fa", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#0d1117", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>
                                                    {user.name?.[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: "13px", fontWeight: 500, color: "#0d1117" }}>{user.name}</p>
                                                    <p style={{ fontSize: "11px", color: "#8c959f" }}>{user.email}</p>
                                                </div>
                                            </div>
                                            <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", background: user.role === "ADMIN" ? "#fff8c5" : "#f6f8fa", color: user.role === "ADMIN" ? "#7d4e00" : "#57606a" }}>
                                                {user.role}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recent listings */}
                            <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", overflow: "hidden" }}>
                                <div style={{ padding: "16px 20px", borderBottom: "1px solid #e1e4e8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#0d1117" }}>Recent listings</h2>
                                    <Link href="/admin/listings" style={{ fontSize: "12px", color: "#57606a", textDecoration: "none" }}>View all →</Link>
                                </div>
                                <div>
                                    {recentListings.map(listing => (
                                        <div key={listing._id} style={{ padding: "12px 20px", borderBottom: "1px solid #f6f8fa", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <div>
                                                <p style={{ fontSize: "13px", fontWeight: 500, color: "#0d1117", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>{listing.title}</p>
                                                <p style={{ fontSize: "11px", color: "#8c959f" }}>{listing.make} {listing.model} · PKR {listing.price.toLocaleString()}</p>
                                            </div>
                                            <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", background: listing.status === "ACTIVE" ? "#dafbe1" : "#fff0f0", color: listing.status === "ACTIVE" ? "#1a7f37" : "#cf222e" }}>
                                                {listing.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
