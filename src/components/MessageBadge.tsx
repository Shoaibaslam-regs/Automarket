"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getPusherClient } from "@/lib/pusher-client";
import { useSession } from "next-auth/react";

export default function MessageBadge() {
  const { data: session } = useSession();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchCount();

    const channel = getPusherClient()?.subscribe(`user-${session.user.id}`);
    channel.bind("new-notification", (data: { type: string }) => {
      if (data.type === "message") {
        setCount(prev => prev + 1);
      }
    });

    return () => {
      channel.unbind_all();
      getPusherClient()?.unsubscribe(`user-${session.user.id}`);
    };
  }, [session?.user?.id]);

  async function fetchCount() {
    try {
      const res = await fetch("/api/messages/unread");
      const data = await res.json();
      setCount(data.count || 0);
    } catch { setCount(0); }
  }

  return (
    <Link href="/messages" className="relative text-sm text-black/70 hover:text-black transition flex items-center gap-1">
      Messages
      {count > 0 && (
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "18px", height: "18px", background: "#0550ae", color: "white", fontSize: "11px", fontWeight: 700, borderRadius: "20px", padding: "0 5px", lineHeight: 1 }}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
