// Counts sponsored ad views and taps from the browser (POST /api/sponsored/track). Client-only.

const KEY = "ad-tracked";

/** Ad ids already counted for this event in this browser session, so reloading or scrolling back doesn't recount. */
function seen(): Set<string> {
  try { return new Set(JSON.parse(sessionStorage.getItem(KEY) || "[]")); } catch { return new Set(); }
}

/** Sends a view or tap for ads not yet counted this session; sendBeacon so a tap still counts as the page changes. */
export function trackAds(ids: string[], event: "view" | "tap") {
  if (typeof window === "undefined") return;
  const done = seen();
  const fresh = ids.filter(id => !done.has(`${event}:${id}`));
  if (!fresh.length) return;
  fresh.forEach(id => done.add(`${event}:${id}`));
  try { sessionStorage.setItem(KEY, JSON.stringify([...done].slice(-500))); } catch {}
  const body = JSON.stringify({ ids: fresh, event });
  if (!navigator.sendBeacon?.("/api/sponsored/track", new Blob([body], { type: "application/json" }))) {
    fetch("/api/sponsored/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  }
}
