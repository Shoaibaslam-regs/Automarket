"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import ModeToggle from "@/components/ModeToggle";

type Organization = {
  name: string;
  type: string;
  plan: string;
  city: string;
};

const NAV_ITEMS = [
  { href: "/business/dashboard",  label: "Dashboard",  icon: "▦" },
  { href: "/business/inventory",  label: "Inventory",  icon: "🚗" },
  { href: "/business/customers",  label: "Customers",  icon: "👥" },
  { href: "/business/rentals",    label: "Rentals",    icon: "🔑" },
  { href: "/business/staff",      label: "Staff",      icon: "👤" },
  { href: "/business/reports",    label: "Reports",    icon: "📊" },
  { href: "/business/settings",   label: "Settings",   icon: "⚙️" },
];

const PLAN_COLORS: Record<string, string> = {
  FREE: "#57606a", PRO: "#0550ae", BUSINESS: "#1a7f37",
};

export default function BusinessSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [org, setOrg] = useState<Organization | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/business/organizations")
      .then(r => r.json())
      .then(d => setOrg(d.organization));
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close mobile on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const SidebarContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* Logo + org name */}
      <div style={{ padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <Link href="/" style={{ display: "block", marginBottom: "12px" }}>
          <Image src="/logo-1771205663069.png" alt="AutoMarket" width={110} height={28}
            style={{ width: "auto", height: "24px", filter: "brightness(0) invert(1)", opacity: 0.8 }} />
        </Link>

        {/* Org dropdown */}
        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontFamily: "inherit" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "linear-gradient(135deg,#3b82f6,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, color: "white", flexShrink: 0 }}>
              {org?.name?.[0]?.toUpperCase() || "B"}
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {org?.name || "My Business"}
              </p>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>
                {org?.type} · <span style={{ color: PLAN_COLORS[org?.plan || "FREE"] }}>{org?.plan}</span>
              </p>
            </div>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
              style={{ flexShrink: 0, transition: "transform 0.2s", transform: dropdownOpen ? "rotate(180deg)" : "none" }}>
              <path d="M2 4l4 4 4-4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {dropdownOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "white", border: "1px solid #e1e4e8", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", padding: "6px", zIndex: 200, animation: "fadeDown 0.15s ease" }}>

              {/* User info */}
              <div style={{ padding: "8px 10px 10px", borderBottom: "1px solid #f0f0f0", marginBottom: "4px" }}>
                <p style={{ fontSize: "12px", fontWeight: 700, color: "#0d1117", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {session?.user?.name}
                </p>
                <p style={{ fontSize: "11px", color: "#8c959f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {session?.user?.email}
                </p>
              </div>

              {[
                { label: "Business settings", href: "/business/settings", icon: "⚙️" },
                { label: "Public profile", href: "/dashboard", icon: "👤" },
                { label: "Marketplace", href: "/", icon: "🏠" },
              ].map(item => (
                <Link key={item.href} href={item.href}
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "7px", textDecoration: "none", color: "#57606a", fontSize: "12px", transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f6f8fa")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <span>{item.icon}</span>{item.label}
                </Link>
              ))}

              <div style={{ height: "1px", background: "#f0f0f0", margin: "4px 0" }} />
              <button onClick={() => signOut({ callbackUrl: "/" })}
                style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "7px", background: "none", border: "none", cursor: "pointer", color: "#cf222e", fontSize: "12px", fontFamily: "inherit" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#fff0f0")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                ↩ Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: "2px", overflowY: "auto" }}>
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}
              style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 10px", borderRadius: "8px", textDecoration: "none", background: isActive ? "rgba(255,255,255,0.1)" : "transparent", color: isActive ? "white" : "rgba(255,255,255,0.5)", fontSize: "13px", fontWeight: isActive ? 600 : 400, transition: "all 0.12s" }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)"; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}>
              <span style={{ fontSize: "15px", width: "20px", textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
              {item.label}
              {isActive && <div style={{ marginLeft: "auto", width: "5px", height: "5px", borderRadius: "50%", background: "white" }} />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: "10px 8px 14px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: "8px" }}>
        <ModeToggle />
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      {/* Desktop sidebar */}
      <div className="biz-desktop-sidebar" style={{ width: "220px", background: "#0d1117", flexShrink: 0, height: "100vh", position: "sticky", top: 0 }}>
        <SidebarContent />
      </div>

      {/* Mobile top bar */}
      <div className="biz-mobile-topbar" style={{ display: "none", position: "fixed", top: 0, left: 0, right: 0, height: "56px", background: "#0d1117", zIndex: 50, padding: "0 16px", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/">
          <Image src="/logo-1771205663069.png" alt="AutoMarket" width={100} height={26}
            style={{ width: "auto", height: "22px", filter: "brightness(0) invert(1)" }} />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
            {org?.name}
          </span>
          <button onClick={() => setMobileOpen(!mobileOpen)}
            style={{ width: "36px", height: "36px", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px" }}>
            <span style={{ width: "16px", height: "2px", background: "white", borderRadius: "2px", display: "block", transition: "transform 0.2s", transform: mobileOpen ? "rotate(45deg) translate(4px, 4px)" : "none" }} />
            <span style={{ width: "16px", height: "2px", background: "white", borderRadius: "2px", display: "block", opacity: mobileOpen ? 0 : 1 }} />
            <span style={{ width: "16px", height: "2px", background: "white", borderRadius: "2px", display: "block", transition: "transform 0.2s", transform: mobileOpen ? "rotate(-45deg) translate(4px, -4px)" : "none" }} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 60 }} />
          <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: "260px", background: "#0d1117", zIndex: 70, animation: "slideIn 0.2s ease" }}>
            <SidebarContent />
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 768px) {
          .biz-desktop-sidebar { display: none !important; }
          .biz-mobile-topbar { display: flex !important; }
        }
      `}</style>
    </>
  );
}
