// How long someone has to wait after a rate limit, in words (server messages) and as a button countdown. Client-safe.

const plural = (n: number, unit: string) => `${n} ${unit}${n !== 1 ? "s" : ""}`;

/** "45 seconds", "2 minutes", "3 hours", "12 days" (rounded up, so it never promises too early) */
export function waitText(sec: number): string {
  if (sec < 60) return plural(Math.max(1, Math.ceil(sec)), "second");
  const min = Math.ceil(sec / 60);
  if (min < 60) return plural(min, "minute");
  const h = Math.ceil(min / 60);
  if (h < 48) return plural(h, "hour");
  return plural(Math.ceil(h / 24), "day");
}

/** A submit button's countdown: "14:32", then "2h 05m" from an hour, then "12 days" from two days */
export function countdownText(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  if (s >= 2 * 86400) return waitText(s);
  const m = Math.floor(s / 60);
  if (m >= 60) return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
