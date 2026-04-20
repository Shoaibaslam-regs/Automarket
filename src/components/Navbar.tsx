"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import BookingBadge from "@/components/BookingBadge";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-blue-600 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-white">AutoMarket</Link>

        <div className="md:flex items-center gap-6">
          <Link href="/listings" className="text-sm text-white hover:text-blue-200">Browse</Link>
          <Link href="/listings?type=RENT" className="text-sm text-white hover:text-blue-200">Rentals</Link>
          {session?.user && (
            <>
              <Link href="/sell" className="text-sm text-white hover:text-blue-200">Sell</Link>
              <BookingBadge />
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {session?.user ? (
            <div className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 text-sm text-white">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-600 font-semibold text-xs">
                  {session.user.name?.[0]?.toUpperCase()}
                </div>
                <span className="md:block">{session.user.name}</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-gray-200 shadow-sm py-1 z-50">
                  <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Dashboard</Link>
                  <Link href="/bookings" onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Bookings</Link>
                  <Link href="/sell" onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Post listing</Link>
                  <hr className="my-1 border-gray-100" />
                  <button onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50">
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm text-white hover:text-blue-200">Sign in</Link>
              <Link href="/register" className="text-sm bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 font-medium">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
