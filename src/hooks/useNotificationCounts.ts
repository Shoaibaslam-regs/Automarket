"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { create } from "zustand";
import { getPusherClient } from "@/lib/pusher-client";

type Counts = {
  /** Unread messages received (from /api/messages/unread). */
  messages: number;
  /** Pending booking requests on the user's own rentals. */
  ownerBookings: number;
  /** Confirmed/cancelled updates on the user's bookings they haven't seen yet. */
  renterBookings: number;
  /** ownerBookings + renterBookings, as /api/bookings/count reports it. */
  bookings: number;
};

const useCountsStore = create<Counts>(() => ({ messages: 0, ownerBookings: 0, renterBookings: 0, bookings: 0 }));

const POLL_MS = 20000;
let subscribers = 0;
let stopPolling: (() => void) | null = null;
let inFlight: Promise<void> | null = null;

/**
 * Re-reads the unread counts from the existing APIs. Pages that mark things as read
 * (messages thread, bookings) call this so the nav badges clear immediately.
 */
export function refreshNotificationCounts(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const [m, b] = await Promise.all([
        fetch("/api/messages/unread").then(r => r.json()).catch(() => ({})),
        fetch("/api/bookings/count").then(r => r.json()).catch(() => ({})),
      ]);
      useCountsStore.setState({
        messages: m.count || 0,
        ownerBookings: b.ownerCount || 0,
        renterBookings: b.renterCount || 0,
        bookings: b.total || 0,
      });
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

// One poller + one realtime subscription shared by every badge on the page
function start(userId: string) {
  refreshNotificationCounts();
  const interval = setInterval(refreshNotificationCounts, POLL_MS);
  const onFocus = () => refreshNotificationCounts();
  window.addEventListener("focus", onFocus);

  let unbind = () => {};
  try {
    const pusher = getPusherClient();
    const channelName = `user-${userId}`;
    const channel = pusher.subscribe(channelName);
    const handler = () => refreshNotificationCounts();
    channel.bind("new-notification", handler);
    unbind = () => {
      channel.unbind("new-notification", handler);
      pusher.unsubscribe(channelName);
    };
  } catch {
    // Pusher not configured: polling still keeps the badges up to date
  }

  stopPolling = () => {
    clearInterval(interval);
    window.removeEventListener("focus", onFocus);
    unbind();
    useCountsStore.setState({ messages: 0, ownerBookings: 0, renterBookings: 0, bookings: 0 });
  };
}

export function useNotificationCounts(): Counts {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const pathname = usePathname();

  useEffect(() => {
    if (!userId) return;
    if (subscribers++ === 0) start(userId);
    return () => {
      if (--subscribers === 0) {
        stopPolling?.();
        stopPolling = null;
      }
    };
  }, [userId]);

  // Counts change when the user reads things, which happens on navigation
  useEffect(() => {
    if (userId) refreshNotificationCounts();
  }, [pathname, userId]);

  return useCountsStore();
}
