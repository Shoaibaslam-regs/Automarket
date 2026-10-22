import { isStaleBuildError } from "@/lib/staleBuild";

/**
 * Sends a crash seen by an error screen to the admin Errors page (POST /api/errors). Client-safe.
 * Errors with a digest already came from the server and were recorded there; stale-build errors are
 * cured by the reload, so neither is sent. Each message is sent once per page load.
 */
const sent = new Set<string>();

export function reportClientError(error: Error & { digest?: string }, where: string): void {
  if (typeof window === "undefined" || error.digest || isStaleBuildError(error)) return;
  const key = `${where}|${error.message}`;
  if (sent.has(key)) return;
  sent.add(key);
  const body = JSON.stringify({
    where,
    message: String(error.message || error.name || "Unknown error").slice(0, 1000),
    stack: error.stack?.slice(0, 4000),
    path: window.location.pathname,
  });
  fetch("/api/errors", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
}
