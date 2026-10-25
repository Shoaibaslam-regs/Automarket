
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ModeToggle from "@/components/ModeToggle";
import Image from "next/image";
import { BarChart3, BookOpen, Car, ClipboardList, Globe, KeyRound, LayoutDashboard, Settings, User, Users, Wallet } from "lucide-react";
import { planInfo } from "@/lib/plans";
import UserIdBadge from "@/components/UserIdBadge";
import VerifiedBadge from "@/components/VerifiedBadge";
import TodayCard from "@/components/business/Today";
import SetupChecklist from "@/components/business/SetupChecklist";
import { OfficialDashboardCard } from "@/components/business/Official";

type Stats = {
  inventory: { totalVehicles: number; available: number; sold: number; reserved: number };
  customers: { totalCustomers: number; leads: number; testDrives: number; closedSales: number };
  rentals: { totalBookings: number; activeRentals: number };
  monthly: { sales: number; revenue: number };
};

type Organization = {
  _id: string;
  name: string;
  type: string;
  plan: string;
  city: string;
  slug?: string;
  verified?: boolean;
};

export default function BusinessDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/business/stats").then(r => r.json()),
      fetch("/api/business/organizations").then(r => r.json()),
    ]).then(([statsData, orgData]) => {
      if (!orgData.organization) {
        router.push("/business/onboarding");
        return;
      }

      setStats(statsData);
      setOrg(orgData.organization);
      setLoading(false);
    });
  }, [router]);

  const navItems = [
    { href: "/business/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/business/inventory", label: "Inventory", icon: Car },
    { href: "/business/customers", label: "Customers", icon: Users },
    { href: "/business/bookings", label: "Bookings", icon: KeyRound },
    { href: "/business/staff", label: "Staff", icon: User },
    { href: "/business/reports", label: "Reports", icon: BarChart3 },
    { href: "/business/settings", label: "Settings", icon: Settings },
  ];

  const Sidebar = () => (
    <div
      style={{
        width: "220px",
        background: "var(--gh-0d1117)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "20px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Image
          src="/logo-1771205663069.png"
          alt="AutoMarket"
          width={110}
          height={28}
          style={{
            width: "auto",
            height: "26px",
            filter: "brightness(0) invert(1)",
            opacity: 0.9,
          }}
        />

        <div
          style={{
            marginTop: "10px",
            padding: "8px 10px",
            background: "rgba(255,255,255,0.06)",
            borderRadius: "7px",
          }}
        >
          <p
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--gh-ffffff)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {org?.name}
          </p>

          <p
            style={{
              fontSize: "10px",
              color: "rgba(255,255,255,0.4)",
              marginTop: "1px",
            }}
          >
            {planInfo(org?.plan).name} plan · {org?.city}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          padding: "12px 10px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        {navItems.map(item => {
          const isActive =
            typeof window !== "undefined" &&
            window.location.pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "9px 12px",
                borderRadius: "8px",
                textDecoration: "none",
                background: isActive
                  ? "rgba(255,255,255,0.1)"
                  : "transparent",
                color: isActive
                  ? "white"
                  : "rgba(255,255,255,0.55)",
                fontSize: "13px",
                fontWeight: isActive ? 600 : 400,
                transition: "all 0.12s",
              }}
            >
              <span
                style={{
                  fontSize: "15px",
                  width: "18px",
                  display: "inline-flex",
                  justifyContent: "center",
                }}
              >
                <item.icon size={16} strokeWidth={1.75} />
              </span>

              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div
        style={{
          padding: "12px 10px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <ModeToggle />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--gh-f6f8fa)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p
          style={{
            color: "var(--gh-57606a)",
            fontSize: "14px",
            animation: "fadeInOut 1.8s ease-in-out infinite",
          }}
        >
          Loading dashboard...
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .biz-layout {
          display: flex;
          height: 100vh;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .biz-sidebar {
          display: flex;
        }

        .biz-main {
          flex: 1;
          overflow-y: auto;
          background: var(--gh-f6f8fa);
        }

        .biz-dash-header { position: sticky; top: 0; z-index: 10; }
        /* On phones the fixed business bar sits on top, so the page header scrolls normally */
        @media (max-width: 768px) {
          .biz-dash-header { position: static; }
          .biz-dash-body { padding: 16px !important; }
        }

        .stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .mini-stat-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .pipeline-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .dashboard-two-col {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        @media (max-width: 1024px) {
          .stat-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .dashboard-two-col {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .quick-actions-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 768px) {
          .biz-sidebar {
            display: none;
          }

          .stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .mini-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .pipeline-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .dashboard-two-col {
            grid-template-columns: 1fr;
          }

          .quick-actions-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 480px) {
          .stat-grid {
            grid-template-columns: 1fr;
          }

          .mini-stat-grid {
            grid-template-columns: 1fr;
          }

          .pipeline-grid {
            grid-template-columns: 1fr;
          }

          .quick-actions-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="biz-layout">

        {/* Main content */}
        <div className="biz-main">
          {/* Top bar: compact on phones, where the fixed business bar already shows the logo and avatar */}
          <div className="biz-dash-header flex items-center justify-between gap-3 border-b border-[var(--gh-e1e4e8)] bg-white px-4 py-3 sm:px-6 sm:py-4">
            <div className="min-w-0">
              <h1 className="text-base font-bold text-[var(--gh-0d1117)] sm:text-lg">Dashboard</h1>
              {org?.name && (
                <p className="flex min-w-0 items-center gap-1 text-[13px] font-semibold text-[var(--gh-57606a)]">
                  <span className="truncate">{org.name}</span>
                  {org.verified && <VerifiedBadge variant="icon" size={14} />}
                </p>
              )}
              <p className="hidden text-xs text-[var(--gh-8c959f)] sm:block">
                {new Date().toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <UserIdBadge id={org?._id} kind="business" className="mt-1 hidden sm:inline-flex" />
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              <Link
                href="/business/guide"
                title="How to use every page, in English and Urdu"
                aria-label="Guide"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-2 text-xs font-semibold text-[var(--gh-0d1117)] transition hover:bg-[var(--gh-f6f8fa)] sm:h-9 sm:px-3 sm:text-[13px]"
              >
                <BookOpen size={14} /> <span className="hidden sm:inline">Guide</span>
              </Link>
              {org?.slug && (
                <a
                  href={`/dealers/${org.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  title="See your shop the way customers see it"
                  aria-label="View public page"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-2 text-xs font-semibold text-[var(--gh-0d1117)] transition hover:bg-[var(--gh-f6f8fa)] sm:h-9 sm:px-3 sm:text-[13px]"
                >
                  <Globe size={14} /> <span className="hidden sm:inline">View public page</span>
                </a>
              )}
              <Link
                href="/sell"
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-[var(--gh-0d1117)] px-2.5 text-xs font-semibold text-white transition hover:bg-[var(--gh-24292f)] sm:h-9 sm:px-4 sm:text-[13px]"
              >
                + <span className="sm:hidden">Add</span><span className="hidden sm:inline">Add vehicle</span>
              </Link>
              <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-[var(--gh-0d1117)] text-[13px] font-bold text-white sm:flex">
                {session?.user?.name?.[0]?.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="biz-dash-body" style={{ padding: "24px" }}>
            <TodayCard />
            {/* Main stats */}
            <div className="stat-grid" style={{ marginBottom: "20px" }}>
              {[
                {
                  label: "Total vehicles",
                  value: stats?.inventory.totalVehicles || 0,
                  icon: Car,
                  sub: `${stats?.inventory.available || 0} available`,
                  color: "var(--gh-0550ae)",
                },
                {
                  label: "Active customers",
                  value: stats?.customers.totalCustomers || 0,
                  icon: Users,
                  sub: `${stats?.customers.leads || 0} new leads`,
                  color: "var(--gh-1a7f37)",
                },
                {
                  label: "This month sales",
                  value: stats?.monthly.sales || 0,
                  icon: Wallet,
                  sub: `PKR ${((stats?.monthly.revenue || 0) / 1000000).toFixed(1)}M sold`,
                  color: "var(--gh-7d4e00)",
                },
                {
                  label: "Active rentals",
                  value: stats?.rentals.activeRentals || 0,
                  icon: KeyRound,
                  sub: `${stats?.rentals.totalBookings || 0} total bookings`,
                  color: "var(--gh-6e40c9)",
                },
              ].map(s => (
                <div
                  key={s.label}
                  style={{
                    background: "var(--gh-ffffff)",
                    border: "1px solid var(--gh-e1e4e8)",
                    borderRadius: "12px",
                    padding: "18px 20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "12px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "12px",
                        color: "var(--gh-8c959f)",
                        fontWeight: 500,
                      }}
                    >
                      {s.label}
                    </p>

                    <span style={{ display: "inline-flex", color: "var(--gh-8c959f)" }}>
                      <s.icon size={18} strokeWidth={1.75} />
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: "28px",
                      fontWeight: 800,
                      color: s.color,
                      marginBottom: "4px",
                    }}
                  >
                    {s.value}
                  </p>

                  <p
                    style={{
                      fontSize: "11px",
                      color: "var(--gh-8c959f)",
                    }}
                  >
                    {s.sub}
                  </p>
                </div>
              ))}
            </div>

            <OfficialDashboardCard />

            {/* Two col */}
            <div className="dashboard-two-col">
              {/* Inventory breakdown */}
              <div
                style={{
                  background: "var(--gh-ffffff)",
                  border: "1px solid var(--gh-e1e4e8)",
                  borderRadius: "12px",
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "var(--gh-0d1117)",
                    }}
                  >
                    Inventory status
                  </h2>

                  <Link
                    href="/business/inventory"
                    style={{
                      fontSize: "12px",
                      color: "var(--gh-57606a)",
                      textDecoration: "none",
                    }}
                  >
                    View all →
                  </Link>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {[
                    {
                      label: "Available",
                      value: stats?.inventory.available || 0,
                      total: stats?.inventory.totalVehicles || 1,
                      color: "var(--gh-1a7f37)",
                    },
                    {
                      label: "Sold",
                      value: stats?.inventory.sold || 0,
                      total: stats?.inventory.totalVehicles || 1,
                      color: "var(--gh-0550ae)",
                    },
                    {
                      label: "Reserved",
                      value: stats?.inventory.reserved || 0,
                      total: stats?.inventory.totalVehicles || 1,
                      color: "var(--gh-e3b341)",
                    },
                  ].map(item => (
                    <div key={item.label}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "12px",
                          marginBottom: "5px",
                        }}
                      >
                        <span style={{ color: "var(--gh-57606a)" }}>
                          {item.label}
                        </span>

                        <span
                          style={{
                            fontWeight: 700,
                            color: "var(--gh-0d1117)",
                          }}
                        >
                          {item.value}
                        </span>
                      </div>

                      <div
                        style={{
                          background: "var(--gh-f6f8fa)",
                          borderRadius: "4px",
                          height: "6px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.round(
                              (item.value / item.total) * 100
                            )}%`,
                            height: "100%",
                            background: item.color,
                            borderRadius: "4px",
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer pipeline */}
              <div
                style={{
                  background: "var(--gh-ffffff)",
                  border: "1px solid var(--gh-e1e4e8)",
                  borderRadius: "12px",
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "var(--gh-0d1117)",
                    }}
                  >
                    Customer pipeline
                  </h2>

                  <Link
                    href="/business/customers"
                    style={{
                      fontSize: "12px",
                      color: "var(--gh-57606a)",
                      textDecoration: "none",
                    }}
                  >
                    View all →
                  </Link>
                </div>

                <div className="pipeline-grid">
                  {[
                    {
                      label: "Leads",
                      value: stats?.customers.leads || 0,
                      color: "var(--gh-8c959f)",
                    },
                    {
                      label: "Interested",
                      value: stats?.customers.totalCustomers || 0,
                      color: "var(--gh-0550ae)",
                    },
                    {
                      label: "Test drives",
                      value: stats?.customers.testDrives || 0,
                      color: "var(--gh-7d4e00)",
                    },
                    {
                      label: "Closed",
                      value: stats?.customers.closedSales || 0,
                      color: "var(--gh-1a7f37)",
                    },
                  ].map(s => (
                    <div
                      key={s.label}
                      style={{
                        border: "1px solid var(--gh-e1e4e8)",
                        borderRadius: "8px",
                        padding: "12px",
                        textAlign: "center",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "22px",
                          fontWeight: 800,
                          color: s.color,
                        }}
                      >
                        {s.value}
                      </p>

                      <p
                        style={{
                          fontSize: "11px",
                          color: s.color,
                          marginTop: "2px",
                        }}
                      >
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div
              style={{
                background: "var(--gh-ffffff)",
                border: "1px solid var(--gh-e1e4e8)",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h2
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "var(--gh-0d1117)",
                  marginBottom: "16px",
                }}
              >
                Quick actions
              </h2>

              <div className="quick-actions-grid">
                {[
                  {
                    href: "/sell",
                    label: "Add vehicle",
                    icon: Car,
                    desc: "List a new vehicle",
                  },
                  {
                    href: "/business/customers?add=1",
                    label: "Add customer",
                    icon: User,
                    desc: "Log a new inquiry",
                  },
                  {
                    href: "/business/inventory",
                    label: "View inventory",
                    icon: ClipboardList,
                    desc: "Manage all vehicles",
                  },
                  {
                    href: "/business/bookings",
                    label: "Bookings",
                    icon: KeyRound,
                    desc: "Walk-ins, handovers & slips",
                  },
                  {
                    href: "/business/reports",
                    label: "View reports",
                    icon: BarChart3,
                    desc: "Sales & rental stats",
                  },
                  {
                    href: "/business/staff",
                    label: "Manage staff",
                    icon: Users,
                    desc: "Add team members",
                  },
                ].map(action => (
                  <Link
                    key={action.label}
                    href={action.href}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      padding: "14px",
                      background: "var(--gh-f6f8fa)",
                      border: "1px solid var(--gh-e1e4e8)",
                      borderRadius: "10px",
                      textDecoration: "none",
                      transition: "all 0.12s",
                    }}
                  >
                    <span style={{ display: "inline-flex", color: "var(--gh-0d1117)" }}>
                      <action.icon size={20} strokeWidth={1.75} />
                    </span>

                    <p
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "var(--gh-0d1117)",
                      }}
                    >
                      {action.label}
                    </p>

                    <p
                      style={{
                        fontSize: "11px",
                        color: "var(--gh-8c959f)",
                      }}
                    >
                      {action.desc}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            {/* First steps for a new business, kept below the daily work */}
            <SetupChecklist />
          </div>
        </div>
      </div>
    </>
  );
}
