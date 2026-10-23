"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

/** "14:32" */
function clock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Locks a form's submit button after the server says an action hit its rate limit (429 / RATE_LIMITED),
 * with a live countdown. The lock is remembered in this browser (localStorage) per `action` and per account
 * ("guest" when signed out, for sign-in and sign-up), so reloading the page doesn't unlock it and switching to
 * another account doesn't carry it over: the server counts most limits per account, so the other account isn't
 * limited. The server enforces the limit either way; this just stops the button from sending requests that
 * would be refused.
 *
 *   const lock = useRateLock("messages");
 *   const res = await fetch(...); const data = await res.json();
 *   if (lock.check(res, data)) return;            // locked: shows the countdown
 *   <button disabled={lock.locked}>{lock.locked ? lock.text : "Send"}</button>
 */
export function useRateLock(action: string) {
  const { data: session, status } = useSession();
  // No key until the session is known, so one account's lock never shows for another while it loads
  const storageKey = status === "loading" ? null : `ratelock:${action}:${session?.user?.id ?? "guest"}`;
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(0);

  // Pick up a lock saved by an earlier visit (after mount, so server HTML stays unlocked)
  useEffect(() => {
    if (!storageKey) return;
    queueMicrotask(() => {
      try {
        const saved = Number(localStorage.getItem(storageKey));
        if (saved > Date.now()) { setUntil(saved); setNow(Date.now()); }
        else setUntil(0);
      } catch {}
    });
  }, [storageKey]);

  // Tick once a second while locked, and clear the lock when it runs out
  useEffect(() => {
    if (!until) return;
    const tick = () => {
      const n = Date.now();
      setNow(n);
      if (n >= until) {
        setUntil(0);
        try { if (storageKey) localStorage.removeItem(storageKey); } catch {}
      }
    };
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [until, storageKey]);

  const secondsLeft = until && now ? Math.max(0, Math.ceil((until - now) / 1000)) : 0;

  function lock(seconds: number) {
    const sec = Math.max(1, Math.round(seconds || 60));
    const u = Date.now() + sec * 1000;
    setUntil(u);
    setNow(Date.now());
    try { if (storageKey) localStorage.setItem(storageKey, String(u)); } catch {}
  }

  /** Locks when the response is a rate-limit refusal; returns true if it did. */
  function check(res: { status: number; headers?: Headers }, data?: { retryAfter?: number; code?: string } | null): boolean {
    if (res.status !== 429 && data?.code !== "RATE_LIMITED") return false;
    lock(data?.retryAfter || Number(res.headers?.get("Retry-After")) || 60);
    return true;
  }

  return {
    locked: secondsLeft > 0,
    secondsLeft,
    /** "Try again in 14:32" */
    text: `Try again in ${clock(secondsLeft)}`,
    lock,
    check,
  };
}
