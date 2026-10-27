// Cross-site request forgery check for API routes (used by src/proxy.ts). Client-safe and unit-tested.

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

type HeaderReader = { get(name: string): string | null };

/**
 * True when a request that changes data was sent by another website: the browser marks it `Sec-Fetch-Site:
 * cross-site`, or its `Origin` names a different host than the one it was sent to. Requests with neither header
 * (server-to-server calls such as UploadThing's callbacks, curl) pass, since browsers always send `Origin` on
 * cross-site writes, and "same-site" covers this app's own pages. An `Origin` of "null" (sandboxed frames) is refused.
 */
export function isCrossSiteWrite(method: string, headers: HeaderReader): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return false;
  if (headers.get("sec-fetch-site") === "cross-site") return true;
  const origin = headers.get("origin");
  if (!origin) return false;
  const host = (headers.get("x-forwarded-host") || headers.get("host") || "").split(",")[0].trim().toLowerCase();
  try {
    return new URL(origin).host.toLowerCase() !== host;
  } catch {
    return true;
  }
}
