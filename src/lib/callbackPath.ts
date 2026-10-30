// Client-safe: where to go after signing in. Every "Sign in" returns the visitor to the page they were on
// (SignInLink, components/auth/SignInLink.tsx); only "Register" from the menus ends at the dashboard. Pages that need an account send people to /login?callbackUrl=<path>
// (the booking page with its picked day, the page the proxy turned them away from); only a path on this site is
// followed, so a link can't send someone to another website after they sign in (an open redirect).

export const DEFAULT_AFTER_SIGN_IN = "/dashboard";

export function safeCallbackPath(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\") || /[\r\n]/.test(v)) return DEFAULT_AFTER_SIGN_IN;
  // The sign-in pages themselves (and the password ones) are no place to come back to
  if (/^\/(login|register|forgot-password|reset-password)(\/|\?|#|$)/.test(v)) return DEFAULT_AFTER_SIGN_IN;
  return v.slice(0, 500);
}

/** "/login?callbackUrl=…" for a path on this site. */
export const loginFor = (path: string) => `/login?callbackUrl=${encodeURIComponent(path)}`;

/** "/register?callbackUrl=…", for the login page's "Create one" while someone is on their way somewhere. */
export const registerFor = (path: string) => `/register?callbackUrl=${encodeURIComponent(path)}`;

/** The page the visitor is on (path and query), for "sign in and come back here". Browser only. */
export const currentPath = () => window.location.pathname + window.location.search;

/** The callbackUrl the login or register page was opened with, already checked (or null when none). */
export function callbackFromUrl(): string | null {
  const raw = new URLSearchParams(window.location.search).get("callbackUrl");
  return raw && safeCallbackPath(raw) !== DEFAULT_AFTER_SIGN_IN ? safeCallbackPath(raw) : null;
}
