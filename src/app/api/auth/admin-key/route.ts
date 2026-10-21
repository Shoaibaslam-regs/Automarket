import { NextRequest, NextResponse } from "next/server";
import { clientIp, hitRateLimit, isRateLimited } from "@/lib/rateLimit";
import { ADMIN_GATE_COOKIE, ADMIN_GATE_TTL_SEC, isAdminAccessKey, newGateValue } from "@/lib/adminGate";

// Same wording as a wrong password on /login, so a wrong key gives nothing away
const GENERIC = "Invalid email or password";

const limited = (retryAfter: number) =>
  NextResponse.json({ error: GENERIC, code: "RATE_LIMITED", retryAfter }, { status: 429, headers: { "Retry-After": String(retryAfter) } });

/**
 * Checks a value typed into the email field of /login against ADMIN_ACCESS_KEY. A correct key sets a short-lived
 * signed cookie that opens the admin sign-in form (the credentials sign-in requires it for portal "admin"); it signs
 * no one in. Wrong keys count per IP (5 in 15 minutes, then locked).
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const before = await isRateLimited("adminKey", ip);
  if (!before.ok) return limited(before.retryAfterSec);

  const { key } = await req.json().catch(() => ({}));
  if (typeof key !== "string" || !isAdminAccessKey(key.trim())) {
    const r = await hitRateLimit("adminKey", ip);
    if (r.remaining === 0) return limited(r.retryAfterSec);
    return NextResponse.json({ error: GENERIC }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_GATE_COOKIE, newGateValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    // Only the sign-in endpoints need it
    path: "/api/auth",
    maxAge: ADMIN_GATE_TTL_SEC,
  });
  return res;
}

/** "Back to user login": closes the admin form. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_GATE_COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/api/auth", maxAge: 0 });
  return res;
}
