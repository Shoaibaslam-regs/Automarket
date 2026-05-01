"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import BookingBadge from "@/components/BookingBadge";
import Image from "next/image";
import MessageBadge from "@/components/MessageBadge";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-black/10 shadow-sm">
      <div className={`max-w-7xl mx-auto px-4 flex items-center justify-between transition-all duration-300 ${scrolled ? "h-14" : "h-20"}`}>

        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo-1771205663069.png"
            alt="AutoMarket"
            width={140}
            height={40}
            style={{ width: "auto", height: scrolled ? "36px" : "44px", transition: "height 0.3s" }}
            priority
          />
        </Link>

        {/* Nav links */}
        <div className="md:flex items-center gap-6">
          <Link href="/listings" className="text-sm text-black/70 hover:text-black transition">Browse</Link>
          <Link href="/listings?type=RENT" className="text-sm text-black/70 hover:text-black transition">Rentals</Link>
          {session?.user && (
            <>
              <Link href="/sell" className="text-sm text-black/70 hover:text-black transition">Sell</Link>
              <BookingBadge />
              <MessageBadge/>
            </>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {session?.user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 text-sm text-black/80 hover:text-black transition">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-semibold text-xs">
                  {session.user.name?.[0]?.toUpperCase()}
                </div>
                <span className="md:block">{session.user.name}</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 backdrop-blur-md bg-white/90 rounded-xl border border-black/10 shadow-lg py-1 z-50">
                  <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-black/80 hover:bg-black/5">Dashboard</Link>
                    <Link href="/bookings" onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-black/80 hover:bg-black/5">Bookings</Link>
                  <Link href="/sell" onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-black/80 hover:bg-black/5">Post listing</Link>
  <Link href="/messages" onClick={() => setMenuOpen(false)}
  className="block px-4 py-2 text-sm text-black/80 hover:bg-black/5">
  Messages
</Link>
<Link href="/profile" onClick={() => setMenuOpen(false)}
  className="block px-4 py-2 text-sm text-black/80 hover:bg-black/5">
  Profile & settings
</Link>
                      {session.user.role === "ADMIN" && (
  <Link href="/admin" onClick={() => setMenuOpen(false)}
  className="block px-4 py-2 text-sm text-black/80 hover:bg-black/5">
    Admin Panel <span style={{float:"right"}}>✯</span>
  </Link>
)}
<hr className="my-1 border-black/10" />
                  <button onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-black/5">
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm text-black/70 hover:text-black transition">Sign in</Link>
              <Link href="/register" className="text-sm bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition font-medium">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
