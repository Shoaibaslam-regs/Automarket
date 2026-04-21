"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function BookingBadge() {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 20000);
    return () => clearInterval(interval);
  }, []);

  async function fetchCount() {
    try {
      const res = await fetch("/api/bookings/count");
      const data = await res.json();
      setTotal(data.total || 0);
    } catch {
      setTotal(0);
    }
  }

  return (
    <Link href="/bookings" className="text-sm text-black/80 hover:text-black transition">
      Bookings
      {total > 0 && (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "18px",
          height: "18px",
          background: "#cf222e",
          color: "white",
          fontSize: "11px",
          fontWeight: 700,
          borderRadius: "20px",
          padding: "0 5px",
          lineHeight: 1,
        }}>
          {total > 99 ? "99+" : total}
        </span>
      )}
    </Link>
  );
}
