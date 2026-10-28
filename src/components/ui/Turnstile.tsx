"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window { turnstile?: TurnstileApi; }
}

let loading: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { loading = null; reject(new Error("Turnstile failed to load")); };
    document.head.appendChild(s);
  });
  return loading;
}

/**
 * Cloudflare Turnstile for a form (server side: src/lib/turnstile.ts). Put `widget` in the form and send
 * `await take()` as `cf`: it hands over the current token (waiting for one if the check is still running) and starts
 * the next, since a token works once. It stays invisible unless Cloudflare wants a tap. Without
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY it renders nothing and `take()` gives "".
 */
export function useTurnstile(action: string) {
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef<string | null>(null);
  const [token, setToken] = useState("");
  const [failed, setFailed] = useState(false);
  const tokenRef = useRef("");
  const waiters = useRef<Array<(t: string) => void>>([]);

  useEffect(() => {
    if (!SITE_KEY || !ref.current) return;
    let cancelled = false;
    const el = ref.current;
    loadScript()
      .then(() => {
        if (cancelled || !window.turnstile) return;
        idRef.current = window.turnstile.render(el, {
          sitekey: SITE_KEY,
          action,
          appearance: "interaction-only",
          size: "flexible",
          theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
          callback: (t: string) => {
            tokenRef.current = t;
            setToken(t);
            setFailed(false);
            waiters.current.splice(0).forEach(w => w(t));
          },
          "expired-callback": () => { tokenRef.current = ""; setToken(""); },
          "error-callback": () => { tokenRef.current = ""; setToken(""); setFailed(true); },
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      if (idRef.current && window.turnstile) window.turnstile.remove(idRef.current);
      idRef.current = null;
    };
  }, [action]);

  const reset = useCallback(() => {
    tokenRef.current = "";
    setToken("");
    if (idRef.current && window.turnstile) window.turnstile.reset(idRef.current);
  }, []);

  /** The token for one request (waits up to 10 s for the check), and a fresh check started for the next. */
  const take = useCallback(async (): Promise<string> => {
    if (!SITE_KEY) return "";
    const t = tokenRef.current || await new Promise<string>(resolve => {
      waiters.current.push(resolve);
      setTimeout(() => resolve(tokenRef.current), 10_000);
    });
    reset();
    return t;
  }, [reset]);

  const widget = SITE_KEY ? (
    <div>
      <div ref={ref} />
      {failed && <p role="alert" style={{ fontSize: "12px", color: "var(--gh-cf222e)", marginTop: "4px" }}>The human check didn&apos;t load. Check your connection and reload the page.</p>}
    </div>
  ) : null;

  return { widget, token, ready: !SITE_KEY || !!token, reset, take };
}
