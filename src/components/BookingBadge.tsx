"use client";

import Link from "next/link";
import { useNotificationCounts } from "@/hooks/useNotificationCounts";
import { CountBadge } from "@/components/NotificationBadge";

export default function BookingBadge() {
  const { bookings } = useNotificationCounts();

  return (
    <Link href="/bookings" className="nav-link" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      Bookings
      <CountBadge count={bookings} />
    </Link>
  );
}
