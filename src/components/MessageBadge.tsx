"use client";

import Link from "next/link";
import { useNotificationCounts } from "@/hooks/useNotificationCounts";
import { CountBadge } from "@/components/NotificationBadge";

export default function MessageBadge() {
  const { messages } = useNotificationCounts();

  return (
    <Link href="/messages" className="nav-link" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      Messages
      <CountBadge count={messages} />
    </Link>
  );
}
