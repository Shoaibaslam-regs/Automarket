// Client-safe: where to go after signing in. Pages that need an account send people to /login?callbackUrl=<path>
// (the booking page with its picked day, the page the proxy turned them away from); only a path on this site is
// followed, so a link can't send someone to another website after they sign in (an open redirect).

export const DEFAULT_AFTER_SIGN_IN = "/dashboard";

export function safeCallbackPath(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\") || /[\r\n]/.test(v)) return DEFAULT_AFTER_SIGN_IN;
  // The login and register pages themselves would send a signed-in visitor straight back to the dashboard
  if (/^\/(login|register)(\/|\?|$)/.test(v)) return DEFAULT_AFTER_SIGN_IN;
  return v.slice(0, 500);
}

/** "/login?callbackUrl=…" for a path on this site. */
export const loginFor = (path: string) => `/login?callbackUrl=${encodeURIComponent(path)}`;
