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
    const [width, setWidth] = useState(1200);

    useEffect(() => {
        setWidth(window.innerWidth);
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

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

    const isMobile = width < 640;
    const isTablet = width < 1024;

    const statCards = stats ? [
        { label: "Total users", value: stats.totalUsers, icon: "👥", color: "#0550ae" },
        { label: "Total listings", value: stats.totalListings, icon: "🚗", color: "#1a7f37" },
        { label: "Active listings", value: stats.activeListings, icon: "✅", color: "#7d4e00" },
        { label: "Total bookings", value: stats.totalBookings, icon: "📅", color: "#6e40c9" },
        { label: "Completed", value: stats.completedBookings, icon: "🏁", color: "#57606a" },
        { label: "Platform fee earned", value: `PKR ${stats.platformFee.toLocaleString()}`, icon: "💰", color: "#1a7f37" },
    ] : [];

    return (
        <div style={{
            minHeight: "100vh",
            background: "#f6f8fa",
            padding: isMobile ? "16px" : "32px 24px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        }}>
            <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

                {/* HEADER */}
                <div style={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "28px"
                }}>
                    <div>
                        <h1 style={{ fontSize: "22px", fontWeight: 700 }}>Admin Dashboard</h1>
                        <p style={{ fontSize: "13px", color: "#57606a" }}>Overview of AutoMarket platform</p>
                    </div>

                    <div style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px"
                    }}>
                        {[
                            { href: "/admin/users", label: "👥 Users" },
                            { href: "/admin/listings", label: "🚗 Listings" },
                            { href: "/admin/analytics", label: "📊 Analytics" },
                            { href: "/admin/bookings", label: "📅 Bookings", primary: true }
                        ].map(btn => (
                            <Link
                                key={btn.href}
                                href={btn.href}
                                style={{
                                    padding: "8px 12px",
                                    borderRadius: "8px",
                                    fontSize: "13px",
                                    textDecoration: "none",
                                    fontWeight: 500,
                                    background: btn.primary ? "#0d1117" : "white",
                                    color: btn.primary ? "white" : "#0d1117",
                                    border: "1px solid #e1e4e8"
                                }}
                            >
                                {btn.label}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* STATS */}
                {loading ? (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
                        gap: "16px"
                    }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} style={{
                                background: "white",
                                height: "90px",
                                borderRadius: "12px",
                                opacity: 0.4
                            }} />
                        ))}
                    </div>
                ) : (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
                        gap: "16px",
                        marginBottom: "28px"
                    }}>
                        {statCards.map(card => (
                            <div key={card.label} style={{
                                background: "white",
                                borderRadius: "12px",
                                padding: "16px",
                                display: "flex",
                                gap: "12px"
                            }}>
                                <div style={{
                                    width: "44px",
                                    height: "44px",
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
                                    <p style={{ fontSize: "18px", fontWeight: 700, color: card.color }}>
                                        {card.value}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* LISTS */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: "20px"
                }}>

                    {/* USERS */}
                    <div style={{ background: "white", borderRadius: "12px", overflow: "hidden" }}>
                        <div style={{
                            padding: "14px 16px",
                            borderBottom: "1px solid #e1e4e8",
                            display: "flex",
                            justifyContent: "space-between"
                        }}>
                            <h2 style={{ fontSize: "14px" }}>Recent users</h2>
                            <Link href="/admin/users" style={{ fontSize: "12px" }}>View all →</Link>
                        </div>

                        {recentUsers.map(user => (
                            <div key={user._id} style={{
                                padding: "12px 16px",
                                borderBottom: "1px solid #f6f8fa",
                                display: "flex",
                                justifyContent: "space-between"
                            }}>
                                <div style={{ display: "flex", gap: "10px" }}>
                                    <div style={{
                                        width: "32px",
                                        height: "32px",
                                        borderRadius: "50%",
                                        background: "#0d1117",
                                        color: "white",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}>
                                        {user.name?.[0]}
                                    </div>
                                    <div>
                                        <p style={{ fontSize: "13px" }}>{user.name}</p>
                                        <p style={{ fontSize: "11px", color: "#8c959f" }}>{user.email}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* LISTINGS */}
                    <div style={{ background: "white", borderRadius: "12px", overflow: "hidden" }}>
                        <div style={{
                            padding: "14px 16px",
                            borderBottom: "1px solid #e1e4e8",
                            display: "flex",
                            justifyContent: "space-between"
                        }}>
                            <h2 style={{ fontSize: "14px" }}>Recent listings</h2>
                            <Link href="/admin/listings" style={{ fontSize: "12px" }}>View all →</Link>
                        </div>

                        {recentListings.map(listing => (
                            <div key={listing._id} style={{
                                padding: "12px 16px",
                                borderBottom: "1px solid #f6f8fa"
                            }}>
                                <p style={{ fontSize: "13px", fontWeight: 500 }}>
                                    {listing.title}
                                </p>
                                <p style={{ fontSize: "11px", color: "#8c959f" }}>
                                    {listing.make} {listing.model} · PKR {listing.price.toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
}