"use client";

import Link from "next/link";
import SignInLink from "@/components/auth/SignInLink";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import BrandLogo from "@/components/BrandLogo";
import dynamic from "next/dynamic";
import UserMenuDropdown, { RingAvatar } from "@/components/UserMenuDropdown";
import { NotificationDot } from "@/components/NotificationBadge";
import { useNotificationCounts } from "@/hooks/useNotificationCounts";
import NotificationBell from "@/components/NotificationBell";
import { ChevronDown, Crown } from "lucide-react";
import { useSubscription } from "@/components/subscription/useSubscription";
import { planInfo } from "@/lib/plans";
import { ThemeCycleButton } from "@/components/theme/ThemeToggle";

// Not needed for the first paint, so they stay out of every page's first download (Radix's dialog, the drawer's
// menus): the drawer loads once the page is idle so a tap opens it at once, the sign-out dialog when asked for
const loadDrawer = () => import("@/components/MobileNavDrawer");
const MobileNavDrawer = dynamic(loadDrawer, { ssr: false });
const SignOutDialog = dynamic(() => import("@/components/SignOutDialog"), { ssr: false });

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Menus remember which route they were opened on, so they close automatically after navigation
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const [mobileOpenOn, setMobileOpenOn] = useState<string | null>(null);
  // Fetch the drawer's code in the background once the page has settled (phones and tablets only)
  useEffect(() => {
    if (!window.matchMedia("(max-width: 768px)").matches) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    const run = () => { loadDrawer().catch(() => {}); };
    if (w.requestIdleCallback) w.requestIdleCallback(run);
    else setTimeout(run, 2000);
  }, []);
  const menuOpen = menuOpenOn === pathname;
  const mobileOpen = mobileOpenOn === pathname;
  const setMenuOpen = (open: boolean) => setMenuOpenOn(open ? pathname : null);
  const setMobileOpen = (open: boolean) => setMobileOpenOn(open ? pathname : null);
  const [scrolled, setScrolled] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const counts = useNotificationCounts();
  const hasUnread = !!session?.user && counts.messages + counts.bookings + counts.purchases > 0;
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

  return (
    <>
      <style>{`
        .nav-desktop { display: flex; }
        /* The logo artwork is dark; lighten it on the dark theme */
        .nav-mobile-btn { display: none; }
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-desktop-right { display: none !important; }
          .nav-mobile-btn { display: flex !important; }
        }
        .nav-link {
          font-size: 14px;
          font-weight: 500;
          color: rgb(var(--tw-c-slate-950) / 0.65);
          text-decoration: none;
          padding: 6px 10px;
          border-radius: 8px;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .nav-link:hover { color: var(--gh-0d1117); background: rgb(var(--tw-c-slate-950) / 0.05); }
        @media (min-width: 769px) and (max-width: 960px) {
          .nav-link { padding: 6px 7px; font-size: 13px; }
        }
      `}</style>

      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgb(var(--tw-c-white) / 0.88)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid rgb(var(--tw-c-slate-950) / 0.08)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}>
        <div className="nav-bar-inner" style={{
          maxWidth: "1280px", margin: "0 auto",
          padding: "0 20px",
          height: scrolled ? "56px" : "64px",
          transition: "height 0.3s",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "12px",
        }}>

          {/* ── LOGO ── */}
          <Link href="/" style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
            <BrandLogo height={scrolled ? 18 : 21} phoneHeight={scrolled ? 13 : 14} priority style={{ transition: "height 0.3s" }} />
          </Link>

          {/* ── DESKTOP CENTER LINKS ── */}
          <div className="nav-desktop" style={{ alignItems: "center", gap: "2px", flex: 1, justifyContent: "center" }}>
            <Link href="/listings" className="nav-link">Browse</Link>
            <Link href="/listings?type=RENT" className="nav-link">Rentals</Link>
            <Link href="/deals" className="nav-link">Deals</Link>
            <Link href="/pricing" className="nav-link">Pricing</Link>
            {session?.user && <Link href="/sell" className="nav-link">Sell</Link>}
            <Link href="/blog" className="nav-link">Blog</Link>
          </div>

          {/* ── DESKTOP RIGHT ── */}
          <div className="nav-desktop nav-desktop-right" style={{ alignItems: "center", gap: "10px", flexShrink: 0 }}>
            {session?.user && <NotificationBell />}
            {session?.user ? (
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="Account menu"
                  // No box around the avatar and name: only a light tint on hover and while the menu is open
                  className={`flex h-11 min-w-[168px] items-center gap-2.5 rounded-2xl pl-1.5 pr-3 transition duration-200 ${
                    menuOpen ? "bg-slate-100" : "hover:bg-slate-100"
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
                      style={{ color: navPlan && navPlan.id !== "FREE" ? (navPlan.id === "UNLIMITED" ? "rgb(var(--tw-c-amber-700))" : navPlan.accent) : "var(--gh-94a3b8)" }}
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
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <ThemeCycleButton />
                <SignInLink style={{ padding: "8px 16px", fontSize: "13px", fontWeight: 600, color: "var(--gh-0d1117)", textDecoration: "none", borderRadius: "8px", border: "1px solid rgb(var(--tw-c-slate-950) / 0.12)" }}>
                  Sign in
                </SignInLink>
                <Link href="/register" style={{ padding: "8px 16px", fontSize: "13px", fontWeight: 600, color: "var(--gh-ffffff)", textDecoration: "none", borderRadius: "8px", background: "var(--gh-0d1117)" }}>
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* ── MOBILE RIGHT: badges + hamburger ── */}
          <div className="nav-mobile-btn" style={{ alignItems: "center", gap: "8px" }}>
            {session?.user && <NotificationBell />}
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
      {confirmSignOut && <SignOutDialog open={confirmSignOut} onOpenChange={setConfirmSignOut} />}
    </>
  );
}
