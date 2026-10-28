// Server-only. The hidden admin entry on /login: typing an admin key in the email field reveals the admin sign-in
// form for that key's admin (the site key, src/lib/adminKey.ts, belongs to the platform owner; every other admin has a
// personal key, src/lib/adminPersonalKey.ts). The key only opens that form through a short-lived signed cookie
// naming the admin; it never signs anyone in. Signing in then needs a 6-digit code emailed to that admin
// (src/lib/adminCode.ts), checked by the credentials sign-in with portal "admin".
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_GATE_COOKIE = "am_admin_gate";
/** How long the admin form stays open after a correct key */
export const ADMIN_GATE_TTL_SEC = 10 * 60;

const digest = (s: string) => createHash("sha256").update(s).digest();

/** Compares a typed value with ADMIN_ACCESS_KEY in constant time. False when no key is configured. */
export function isAdminAccessKey(input: string): boolean {
  const key = process.env.ADMIN_ACCESS_KEY;
  if (!key || key.length < 16 || !input) return false;
  return timingSafeEqual(digest(input), digest(key));
}

function sign(exp: number, userId: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`admin-gate.${exp}.${userId}`).digest("base64url");
}

/** The cookie value after a correct key: "<expiry>.<admin's user id>.<signature>". The key decides whose form opens. */
export function newGateValue(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + ADMIN_GATE_TTL_SEC;
  return `${exp}.${userId}.${sign(exp, userId)}`;
}

/** The admin whose key opened the form, from a valid, unexpired gate cookie (read from the Cookie header), or null. */
export function adminGateUser(cookieHeader: string | null | undefined): string | null {
  const raw = cookieHeader?.split(/;\s*/).find(c => c.startsWith(`${ADMIN_GATE_COOKIE}=`))?.slice(ADMIN_GATE_COOKIE.length + 1);
  if (!raw) return null;
  const [expStr, userId, sig] = decodeURIComponent(raw).split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000 || !userId || !/^[0-9a-f]{24}$/.test(userId) || !sig) return null;
  const expected = sign(exp, userId);
  return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? userId : null;
}
