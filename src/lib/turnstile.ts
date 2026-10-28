// Server-only. Cloudflare Turnstile: an invisible "are you human" check on sign-up, sign-in, Forgot password, the
// admin key, Help & support, feedback and reports, so scripted sign-ups and form spam are stopped, not just slowed.
// Needs NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY; while either is unset the check is skipped, so the
// site works before the keys are added. The forms send the token as `cf` (components/ui/Turnstile.tsx).
import { NextResponse } from "next/server";
import { reportError } from "@/lib/errorLog";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const turnstileEnabled = () => !!process.env.TURNSTILE_SECRET_KEY && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * Whether the request passed the check. A missing or used token fails. If Cloudflare can't be reached the request is
 * let through (logged), so an outage there doesn't lock everyone out; the rate limits still apply.
 */
export async function verifyTurnstile(token: unknown, ip?: string | null): Promise<boolean> {
  if (!turnstileEnabled()) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(5000) });
    const data = (await res.json().catch(() => null)) as { success?: boolean } | null;
    return data?.success === true;
  } catch (e) {
    reportError("Turnstile check failed (let through):", e);
    return true;
  }
}

/** The answer when the check fails; the form resets its check and the person tries again. */
export function turnstileRefusal() {
  return NextResponse.json({ error: "We couldn't confirm you're a person. Please try again.", code: "CAPTCHA" }, { status: 400 });
}
