"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import BookingBadge from "@/components/BookingBadge";
import MessageBadge from "@/components/MessageBadge";
import Image from "next/image";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handler = () => { setMenuOpen(false); };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <>
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-black/10 shadow-sm">
        <div className={`max-w-7xl mx-auto px-4 flex items-center justify-between transition-all duration-300 ${scrolled ? "h-14" : "h-16 md:h-20"}`}>

          {/* Logo */}
          <Link href="/home" className="flex items-center flex-shrink-0">
            <Image
              src="/logo-1771205663069.png"
              alt="AutoMarket"
              width={140}
              height={40}
              style={{ width: "auto", height: scrolled ? "32px" : "40px", transition: "height 0.3s" }}
              priority
            />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-5">
            <Link href="/listings" className="text-sm text-black/70 hover:text-black transition font-medium">Browse</Link>
            <Link href="/listings?type=RENT" className="text-sm text-black/70 hover:text-black transition font-medium">Rentals</Link>
            {session?.user && (
              <>
                <Link href="/sell" className="text-sm text-black/70 hover:text-black transition font-medium">Sell</Link>
                <BookingBadge />
                <MessageBadge />
              </>
            )}
          </div>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-3">
            {session?.user ? (
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 text-sm text-black/80 hover:text-black transition">
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs overflow-hidden relative">
                    {session.user.image ? (
                      <Image src={session.user.image} alt="" fill sizes="32px" style={{ objectFit: "cover" }} />
                    ) : session.user.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="font-medium max-w-[100px] truncate">{session.user.name}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transition: "transform 0.2s", transform: menuOpen ? "rotate(180deg)" : "rotate(0)" }}>
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-52 backdrop-blur-md bg-white/95 rounded-xl border border-black/10 shadow-xl py-1 z-50">
                    <div className="px-4 py-2 border-b border-black/5 mb-1">
                      <p className="text-xs font-semibold text-black/80 truncate">{session.user.name}</p>
                      <p className="text-xs text-black/40 truncate">{session.user.email}</p>
                    </div>
                    {[
                      { href: "/dashboard", label: "Dashboard", icon: "⊞" },
                      { href: "/bookings", label: "Bookings", icon: "📅" },
                      { href: "/messages", label: "Messages", icon: "💬" },
                      { href: "/profile", label: "Profile & settings", icon: "⚙️" },
                    ].map(item => (
                      <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-black/70 hover:bg-black/5 hover:text-black transition">
                        <span>{item.icon}</span>{item.label}
                      </Link>
                    ))}
                    {session.user.role === "ADMIN" && (
                      <Link href="/admin" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 transition font-medium">
                        ⚡ Admin panel
                      </Link>
                    )}
                    <div className="border-t border-black/5 mt-1 pt-1">
                      <button onClick={() => signOut({ callbackUrl: "/landing" })}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition">
                        ↩ Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className="text-sm text-black/70 hover:text-black transition font-medium">Sign in</Link>
                <Link href="/register" className="text-sm bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition font-semibold">
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-black/5 transition">
            <div style={{ width: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ height: "2px", background: "#0d1117", borderRadius: "2px", transition: "transform 0.2s", transform: mobileOpen ? "rotate(45deg) translate(4px, 4px)" : "none" }} />
              <div style={{ height: "2px", background: "#0d1117", borderRadius: "2px", opacity: mobileOpen ? 0 : 1, transition: "opacity 0.2s" }} />
              <div style={{ height: "2px", background: "#0d1117", borderRadius: "2px", transition: "transform 0.2s", transform: mobileOpen ? "rotate(-45deg) translate(4px, -4px)" : "none" }} />
            </div>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-black/10 px-4 py-4 space-y-1">
            {[
              { href: "/listings", label: "Browse" },
              { href: "/listings?type=RENT", label: "Rentals" },
            ].map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-black/70 hover:bg-black/5 rounded-lg">
                {item.label}
              </Link>
            ))}

            {session?.user ? (
              <>
                <div className="border-t border-black/5 pt-2 mt-2">
                  <div className="flex items-center gap-3 px-3 py-2 mb-1">
                    <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
                      {session.user.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-black/80">{session.user.name}</p>
                      <p className="text-xs text-black/40">{session.user.email}</p>
                    </div>
                  </div>
                  {[
                    { href: "/sell", label: "Sell a vehicle" },
                    { href: "/dashboard", label: "Dashboard" },
                    { href: "/bookings", label: "Bookings" },
                    { href: "/messages", label: "Messages" },
                    { href: "/profile", label: "Profile & settings" },
                  ].map(item => (
                    <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2.5 text-sm text-black/70 hover:bg-black/5 rounded-lg">
                      {item.label}
                    </Link>
                  ))}
                  {session.user.role === "ADMIN" && (
                    <Link href="/admin" onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2.5 text-sm text-amber-600 font-medium hover:bg-amber-50 rounded-lg">
                      ⚡ Admin panel
                    </Link>
                  )}
                  <button onClick={() => signOut({ callbackUrl: "/landing" })}
                    className="w-full text-left px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-lg mt-1">
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <div className="border-t border-black/5 pt-3 mt-2 flex gap-2">
                <Link href="/login" onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center py-2.5 text-sm font-medium text-black/70 border border-black/10 rounded-lg">
                  Sign in
                </Link>
                <Link href="/register" onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center py-2.5 text-sm font-semibold text-white bg-black rounded-lg">
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>
    </>
  );
}
