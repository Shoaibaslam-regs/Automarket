"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import BookingBadge from "@/components/BookingBadge";
import MessageBadge from "@/components/MessageBadge";
import ModeToggle from "@/components/ModeToggle";
import Image from "next/image";
import SignOutDialog from "@/components/SignOutDialog";
import { Calendar, Car, KeyRound, LayoutDashboard, LogOut, MessageSquare, Search, Settings, ShieldCheck } from "lucide-react";

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
        .nav-mobile-menu { display: none; }
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-desktop-right { display: none !important; }
          .nav-mobile-btn { display: flex !important; }
          .nav-mobile-menu.open { display: flex !important; }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
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
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 14px;
          font-size: 13px;
          color: rgba(0,0,0,0.7);
          text-decoration: none;
          border-radius: 8px;
          transition: background 0.12s;
          font-weight: 500;
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          cursor: pointer;
          font-family: inherit;
        }
        .dropdown-item:hover { background: rgba(0,0,0,0.05); color: #0d1117; }
        .mobile-nav-link {
          display: block;
          padding: 13px 20px;
          font-size: 15px;
          font-weight: 500;
          color: rgba(0,0,0,0.75);
          text-decoration: none;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          transition: background 0.1s;
        }
        .mobile-nav-link:hover { background: rgba(0,0,0,0.03); }
        .mobile-nav-link:last-child { border-bottom: none; }
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
            {session?.user && (
              <>
                <Link href="/sell" className="nav-link">Sell</Link>
              <BookingBadge /> 

              </>
            )}
          </div>

          {/* ── DESKTOP RIGHT ── */}
          <div className="nav-desktop nav-desktop-right" style={{ alignItems: "center", gap: "10px", flexShrink: 0 }}>
            {session?.user ? (
              <div ref={dropdownRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "6px 10px 6px 6px",
                    background: menuOpen ? "rgba(0,0,0,0.05)" : "transparent",
                    border: "1px solid",
                    borderColor: menuOpen ? "rgba(0,0,0,0.1)" : "transparent",
                    borderRadius: "40px", cursor: "pointer",
                    fontFamily: "inherit", transition: "all 0.15s",
                  }}>
                  <div style={{
                    width: "30px", height: "30px", borderRadius: "50%",
                    background: "#0d1117", color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "12px", fontWeight: 700, flexShrink: 0,
                  }}>
                    {session.user.name?.[0]?.toUpperCase()}
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117", maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {session.user.name?.split(" ")[0]}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                    style={{ transition: "transform 0.2s", transform: menuOpen ? "rotate(180deg)" : "none", flexShrink: 0 }}>
                    <path d="M2 4l4 4 4-4" stroke="#8c959f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {menuOpen && (
                  <div style={{
                    position: "absolute", right: 0, top: "calc(100% + 8px)",
                    width: "230px", background: "white",
                    border: "1px solid rgba(0,0,0,0.1)", borderRadius: "14px",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.12)", padding: "6px",
                    animation: "fadeDown 0.15s ease", zIndex: 200,
                  }}>
                    {/* User info */}
                    <div style={{ padding: "10px 14px 10px", marginBottom: "4px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: "#0d1117", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user.name}</p>
                      <p style={{ fontSize: "11px", color: "#8c959f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user.email}</p>
                    
                    </div>

                    <ModeToggle/>

                    {[
                      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
                      { href: "/bookings", icon: Calendar, label: "Bookings" },
                      { href: "/messages", icon: MessageSquare, label: "Messages" },
                      { href: "/profile", icon: Settings, label: "Profile & settings" },
                    ].map(item => (
                      <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="dropdown-item">
                        <span style={{ fontSize: "15px", width: "20px", textAlign: "center", display: "inline-flex", justifyContent: "center" }}><item.icon size={16} strokeWidth={1.75} /></span>
                        {item.label}
                      </Link>
                    ))}

                    {session.user.role === "ADMIN" && (
                      <>
                        <div style={{ height: "1px", background: "rgba(0,0,0,0.06)", margin: "4px 6px" }} />
                        <Link href="/admin" onClick={() => setMenuOpen(false)} className="dropdown-item" style={{ color: "#d97706" }}>
                          <span style={{ width: "20px", display: "inline-flex", justifyContent: "center" }}><ShieldCheck size={16} strokeWidth={1.75} /></span>
                          Admin panel
                        </Link>
                      </>
                    )}

                    <div style={{ height: "1px", background: "rgba(0,0,0,0.06)", margin: "4px 6px" }} />
                    <button onClick={() => { setMenuOpen(false); setConfirmSignOut(true); }}
                      className="dropdown-item" style={{ color: "#dc2626" }}>
                      <span style={{ width: "20px", display: "inline-flex", justifyContent: "center" }}><LogOut size={16} strokeWidth={1.75} /></span>
                      Sign out
                    </button>
                  </div>
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
            
            <button
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{
                width: "40px", height: "40px", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: "5px",
                background: mobileOpen ? "rgba(0,0,0,0.06)" : "transparent",
                border: "none", cursor: "pointer", borderRadius: "10px", padding: "8px",
              }}>
              <span style={{ display: "block", width: "20px", height: "2px", background: "#0d1117", borderRadius: "2px", transition: "transform 0.22s", transform: mobileOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
              <span style={{ display: "block", width: "20px", height: "2px", background: "#0d1117", borderRadius: "2px", opacity: mobileOpen ? 0 : 1, transition: "opacity 0.15s" }} />
              <span style={{ display: "block", width: "20px", height: "2px", background: "#0d1117", borderRadius: "2px", transition: "transform 0.22s", transform: mobileOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
            </button>
          </div>
        </div>

        {/* ── MOBILE MENU DRAWER ── */}
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <div onClick={() => setMobileOpen(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 80, top: "64px" }} />

            {/* Drawer */}
            <div className="nav-mobile-menu open"
              style={{
                position: "fixed", top: scrolled ? "56px" : "64px", left: 0, right: 0,
                background: "white", zIndex: 90, flexDirection: "column",
                borderBottom: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                animation: "slideDown 0.2s ease",
                maxHeight: "calc(100vh - 64px)", overflowY: "auto",
              }}>

              {/* User info banner */}
              {session?.user && (
                <div style={{ padding: "14px 20px 12px", background: "#f6f8fa", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#0d1117", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, flexShrink: 0 }}>
                    {session.user.name?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#0d1117", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user.name}</p>

                    <p style={{ fontSize: "12px", color: "#8c959f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user.email}</p>
                  </div>
                </div>
              )}

              {/* Nav links */}
              <div style={{ padding: "8px 12px" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, color: "#8c959f", textTransform: "uppercase", letterSpacing: "0.6px", padding: "8px 8px 4px" }}>Browse</p>

                {[
                  { href: "/listings", label: "Browse vehicles", icon: Search },
                  { href: "/listings?type=RENT", label: "Rentals", icon: KeyRound },
                ].map(item => (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 8px", fontSize: "14px", fontWeight: 500, color: "#0d1117", textDecoration: "none", borderRadius: "8px" }}>
                    <span style={{ fontSize: "18px", width: "24px", textAlign: "center", display: "inline-flex", justifyContent: "center" }}><item.icon size={18} strokeWidth={1.75} /></span>
                    {item.label}
                  </Link>
                  
                ))}

                {session?.user && (
                  <>
                    <div style={{ height: "1px", background: "rgba(0,0,0,0.06)", margin: "8px 0" }} />
                    <p style={{ fontSize: "10px", fontWeight: 700, color: "#8c959f", textTransform: "uppercase", letterSpacing: "0.6px", padding: "8px 8px 4px" }}>My account</p>
                    
                    {[
                      { href: "/sell", label: "Sell a vehicle", icon: Car },
                      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
                      { href: "/bookings", label: "My bookings", icon: Calendar },
                      { href: "/messages", label: "Messages", icon: MessageSquare },
                      { href: "/profile", label: "Profile & settings", icon: Settings },
                    ].map(item => (
                      <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                        style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 8px", fontSize: "14px", fontWeight: 500, color: "#0d1117", textDecoration: "none", borderRadius: "8px" }}>
                        <span style={{ fontSize: "18px", width: "24px", textAlign: "center", display: "inline-flex", justifyContent: "center" }}><item.icon size={18} strokeWidth={1.75} /></span>
                        {item.label} 
                      </Link>
                    ))}

                     <div style={{ height: "1px", background: "rgba(0,0,0,0.06)", margin: "8px 0" }} />
                      <p style={{ fontSize: "10px", fontWeight: 700, color: "#8c959f", textTransform: "uppercase", letterSpacing: "0.6px", padding: "8px 8px 4px" }}>Business</p>
                    {/* Mode toggle in mobile */}
                      <div style={{padding: "8px 8px", margin: "4px 0" }}>
                       <ModeToggle />
                      </div>
                    
                      
                
                    {session.user.role === "ADMIN" && (
                      <>
                        <div style={{ height: "1px", background: "rgba(0,0,0,0.06)", margin: "8px 0" }} />
                        <Link href="/admin" onClick={() => setMobileOpen(false)}
                          style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 8px", fontSize: "14px", fontWeight: 600, color: "#d97706", textDecoration: "none", borderRadius: "8px" }}>
                          <span style={{ width: "24px", display: "inline-flex", justifyContent: "center" }}><ShieldCheck size={18} strokeWidth={1.75} /></span>
                          Admin panel
                        </Link>
                      </>
                    )}

                    <div style={{ height: "1px", background: "rgba(0,0,0,0.06)", margin: "8px 0" }} />
                    <button onClick={() => { setMobileOpen(false); setConfirmSignOut(true); }}
                      style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 8px", fontSize: "14px", fontWeight: 500, color: "#dc2626", background: "none", border: "none", cursor: "pointer", width: "100%", fontFamily: "inherit", borderRadius: "8px" }}>
                      <span style={{ width: "24px", display: "inline-flex", justifyContent: "center" }}><LogOut size={18} strokeWidth={1.75} /></span>
                      Sign out
                    </button>
                  </>
                )}

                {!session?.user && (
                  <>
                    <div style={{ height: "1px", background: "rgba(0,0,0,0.06)", margin: "12px 0 8px" }} />
                    <div style={{ display: "flex", gap: "8px", padding: "4px 8px 12px" }}>
                      <Link href="/login" onClick={() => setMobileOpen(false)}
                        style={{ flex: 1, textAlign: "center", padding: "12px", fontSize: "14px", fontWeight: 600, color: "#0d1117", textDecoration: "none", border: "1px solid rgba(0,0,0,0.12)", borderRadius: "10px" }}>
                        Sign in
                      </Link>
                      <Link href="/register" onClick={() => setMobileOpen(false)}
                        style={{ flex: 1, textAlign: "center", padding: "12px", fontSize: "14px", fontWeight: 600, color: "white", textDecoration: "none", background: "#0d1117", borderRadius: "10px" }}>
                        Register
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </nav>
      <SignOutDialog open={confirmSignOut} onOpenChange={setConfirmSignOut} />
    </>
  );
}
