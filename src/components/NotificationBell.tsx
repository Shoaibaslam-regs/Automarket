"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotificationCounts } from "@/hooks/useNotificationCounts";
import { CountBadge } from "@/components/NotificationBadge";

/** Total of everything the menu badges count, so the bell and the badges always agree. */
export function useNotificationTotal() {
  const c = useNotificationCounts();
  return c.messages + c.bookings + c.purchases + c.sales + c.updates;
}

/** Bell that opens /notifications, with the number of things waiting. `tone="dark"` for the business console bar. */
export default function NotificationBell({ tone = "light", className = "" }: { tone?: "light" | "dark"; className?: string }) {
  const total = useNotificationTotal();
  const look = tone === "dark"
    ? "bg-white/10 text-white ring-white/15 hover:bg-white/15"
    : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50";
  return (
    <Link href="/notifications" aria-label={total ? `Notifications, ${total} new` : "Notifications"}
      className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition active:scale-95 ${look} ${className}`}>
      <Bell size={18} strokeWidth={2} />
      <CountBadge count={total} hidden className="absolute -right-1.5 -top-1.5 ring-2 ring-white" />
    </Link>
  );
}
