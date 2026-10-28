import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { clientIp, hitRateLimit, isRateLimited } from "@/lib/rateLimit";
import { ADMIN_GATE_COOKIE, ADMIN_GATE_TTL_SEC, newGateValue } from "@/lib/adminGate";
import { checkAdminAccessKey } from "@/lib/adminKey";
import { adminForPersonalKey } from "@/lib/adminPersonalKey";
import { issueAdminCode } from "@/lib/adminCode";
import { maskDestination } from "@/lib/signupCode";
import { reportError } from "@/lib/errorLog";

// Same wording as a wrong password on /login, so a wrong key gives nothing away
const GENERIC = "Invalid email or password";

const limited = (retryAfter: number) =>
  NextResponse.json({ error: GENERIC, code: "RATE_LIMITED", retryAfter }, { status: 429, headers: { "Retry-After": String(retryAfter) } });

/** The admin a typed key belongs to: the site key is the platform owner's, every other admin has a personal key. */
async function adminForKey(key: string): Promise<string | null> {
  if (await checkAdminAccessKey(key)) {
    const ownerEmail = process.env.ADMIN_EMAIL?.trim();
    if (!ownerEmail) return null;
    const owner = await User.findOne({ email: new RegExp(`^${ownerEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), role: "ADMIN" })
      .select("_id").lean<{ _id: unknown }>();
    return owner ? String(owner._id) : null;
  }
  const admin = await adminForPersonalKey(key);
  return admin ? String(admin._id) : null;
}

/**
 * Checks a value typed into the email field of /login against the admin keys. A correct key sets a short-lived signed
 * cookie naming that admin, which opens the admin sign-in form, and emails them a 6-digit code (src/lib/adminCode.ts);
 * the answer says where it went, masked. It signs no one in. Wrong keys count per IP (5 in 15 minutes, then locked).
 */
export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const before = await isRateLimited("adminKey", ip);
    if (!before.ok) return limited(before.retryAfterSec);

    const { key } = await req.json().catch(() => ({}));
    await connectDB();
    const adminId = typeof key === "string" ? await adminForKey(key.trim()) : null;
    if (!adminId) {
      const r = await hitRateLimit("adminKey", ip);
      if (r.remaining === 0) return limited(r.retryAfterSec);
      return NextResponse.json({ error: GENERIC }, { status: 401 });
    }

    const send = await hitRateLimit("adminCodeSend", adminId);
    const email = send.ok ? await issueAdminCode(adminId) : (await User.findById(adminId).select("email").lean<{ email: string }>())?.email;
    const res = NextResponse.json({ ok: true, sentTo: email ? maskDestination("email", email) : null, sent: send.ok });
    res.cookies.set(ADMIN_GATE_COOKIE, newGateValue(adminId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      // Only the sign-in endpoints need it
      path: "/api/auth",
      maxAge: ADMIN_GATE_TTL_SEC,
    });
    return res;
  } catch (error) {
    reportError("Admin key error:", error);
    return NextResponse.json({ error: GENERIC }, { status: 401 });
  }
}

/** "Back to user login": closes the admin form. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_GATE_COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/api/auth", maxAge: 0 });
  return res;
}
