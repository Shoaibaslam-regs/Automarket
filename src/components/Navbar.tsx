"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import BookingBadge from "@/components/BookingBadge";
import MessageBadge from "@/components/MessageBadge";
import Image from "next/image";
import SignOutDialog from "@/components/SignOutDialog";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import UserMenuDropdown, { RingAvatar } from "@/components/UserMenuDropdown";
import { NotificationDot } from "@/components/NotificationBadge";
import { useNotificationCounts } from "@/hooks/useNotificationCounts";
import { Car, ChevronDown, Crown } from "lucide-react";
import { useSubscription } from "@/components/subscription/useSubscription";
import { planInfo } from "@/lib/plans";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Menus remember which route they were opened on, so they close automatically after navigation
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const [mobileOpenOn, setMobileOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === pathname;
  const mobileOpen = mobileOpenOn === pathname;
  const setMenuOpen = (open: boolean) => setMenuOpenOn(open ? pathname : null);
  const setMobileOpen = (open: boolean) => setMobileOpenOn(open ? pathname : null);
  const [scrolled, setScrolled] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const counts = useNotificationCounts();
  const hasUnread = !!session?.user && counts.messages + counts.bookings > 0;
  // Plan label under the name on the account button; fetched once per page load for signed-in users
  const { data: navSub } = useSubscription(!!session?.user);
  const navPlan = navSub ? planInfo(navSub.planId) : null;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Landing page: minimal dark bar with just the logo, Sign in and Get started.
  // Rendered by this same component (not by the page) so navigating away never shows two navbars.
  if (pathname === "/") {
    return (
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-slate-950">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex flex-shrink-0 items-center">
            <Image
              src="/logo-1771205663069.png"
              alt="AutoMarket"
              width={130}
              height={36}
              priority
              className="h-7 w-auto sm:h-8"
              style={{ filter: "brightness(0.5) invert(1)" }}
            />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white sm:px-4">
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-white/10 transition hover:bg-slate-200 sm:px-4"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <>
      <style>{`
        .nav-desktop { display: flex; }
        .nav-mobile-btn { display: none; }
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-desktop-right { display: none !important; }
          .nav-mobile-btn { display: flex !important; }
        }
        .nav-link {
          font-size: 14px;
          font-weight: 500;
          color: rgba(0,0,0,0.65);
          text-decoration: none;
          padding: 6px 10px;
          border-radius: 8px;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .nav-link:hover { color: #0d1117; background: rgba(0,0,0,0.04); }
        @media (min-width: 769px) and (max-width: 960px) {
          .nav-link { padding: 6px 7px; font-size: 13px; }
        }
      `}</style>

      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}>
        <div style={{
          maxWidth: "1280px", margin: "0 auto",
          padding: "0 20px",
          height: scrolled ? "56px" : "64px",
          transition: "height 0.3s",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "12px",
        }}>

          {/* ── LOGO ── */}
          <Link href="/home" style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
            <Image
              src="/logo-1771205663069.png"
              alt="AutoMarket"
              width={140}
              height={40}
              style={{ width: "auto", height: scrolled ? "30px" : "36px", transition: "height 0.3s" }}
              priority
            />
          </Link>

          {/* ── DESKTOP CENTER LINKS ── */}
          <div className="nav-desktop" style={{ alignItems: "center", gap: "2px", flex: 1, justifyContent: "center" }}>
            <Link href="/listings" className="nav-link">Browse</Link>
            <Link href="/listings?type=RENT" className="nav-link">Rentals</Link>
            <Link href="/pricing" className="nav-link">Pricing</Link>
            {session?.user && (
              <>
                <Link href="/sell" className="nav-link">Sell</Link>
                <BookingBadge />
                <MessageBadge />

              </>
            )}
          </div>

          {/* ── DESKTOP RIGHT ── */}
          <div className="nav-desktop nav-desktop-right" style={{ alignItems: "center", gap: "10px", flexShrink: 0 }}>
            {session?.user ? (
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="Account menu"
                  className={`flex h-11 min-w-[168px] items-center gap-2.5 rounded-2xl pl-1.5 pr-3 ring-1 ring-inset transition duration-200 ${
                    menuOpen
                      ? "bg-slate-50 shadow-[0_8px_20px_-10px_rgba(15,23,42,0.35)] ring-slate-300"
                      : "bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)] ring-slate-200/90 hover:bg-slate-50 hover:ring-slate-300"
                  }`}
                >
                  <span className="relative flex flex-shrink-0">
                    <RingAvatar name={session.user.name} image={session.user.image} size={30} />
                    <NotificationDot show={hasUnread} className="-right-0.5 -top-0.5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col items-start">
                    <span className="max-w-[110px] truncate text-[13px] font-semibold leading-4 text-slate-900">{session.user.name}</span>
                    <span
                      className="mt-0.5 flex items-center gap-1 text-[11px] font-medium leading-3"
                      style={{ color: navPlan && navPlan.id !== "FREE" ? (navPlan.id === "UNLIMITED" ? "#b45309" : navPlan.accent) : "#94a3b8" }}
                    >
                      {navPlan && navPlan.id !== "FREE" && <Crown size={10} strokeWidth={2.25} />}
                      {navPlan ? (navPlan.id === "FREE" ? "Free plan" : navPlan.name) : "\u00a0"}
                    </span>
                  </span>
                  <ChevronDown size={14} strokeWidth={2.25} className={`flex-shrink-0 text-slate-400 transition duration-200 ${menuOpen ? "rotate-180 text-slate-700" : ""}`} />
                </button>

                {menuOpen && (
                  <UserMenuDropdown
                    session={session}
                    counts={counts}
                    onClose={() => setMenuOpen(false)}
                    onSignOut={() => setConfirmSignOut(true)}
                  />
                )}
              </div>
            ) : (
              <div style={{ display: "flex", gap: "8px" }}>
                <Link href="/login" style={{ padding: "8px 16px", fontSize: "13px", fontWeight: 600, color: "#0d1117", textDecoration: "none", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.12)" }}>
                  Sign in
                </Link>
                <Link href="/register" style={{ padding: "8px 16px", fontSize: "13px", fontWeight: 600, color: "white", textDecoration: "none", borderRadius: "8px", background: "#0d1117" }}>
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* ── MOBILE RIGHT: badges + hamburger ── */}
          <div className="nav-mobile-btn" style={{ alignItems: "center", gap: "8px" }}>
            
            {session?.user && (
              <Link href="/sell" aria-label="Sell a vehicle"
                className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-[13px] font-semibold text-white shadow-sm shadow-slate-900/20 transition active:scale-95">
                <Car size={15} strokeWidth={2} /> Sell
              </Link>
            )}
            <button
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className="relative flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded-xl bg-white ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 active:scale-95"
            >
              <NotificationDot show={hasUnread} className="right-1.5 top-1.5" />
              {session?.user ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 text-xs font-bold text-white">
                  {session.user.name?.[0]?.toUpperCase() || "?"}
                </span>
              ) : (
                <>
                  <span className="block h-[2px] w-[18px] rounded-full bg-slate-900" />
                  <span className="block h-[2px] w-[12px] self-center rounded-full bg-slate-900" />
                  <span className="block h-[2px] w-[18px] rounded-full bg-slate-900" />
                </>
              )}
            </button>
          </div>
        </div>

      </nav>
      <MobileNavDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onSignOut={() => setConfirmSignOut(true)}
        session={session}
        counts={counts}
      />
      <SignOutDialog open={confirmSignOut} onOpenChange={setConfirmSignOut} />
    </>
  );
}
