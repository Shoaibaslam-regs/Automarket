// Server-only. The hidden admin entry on /login: typing ADMIN_ACCESS_KEY in the email field reveals the admin
// sign-in form. The key only opens that form (through a short-lived signed cookie); it never signs anyone in. The
// admin form still goes through the normal credentials sign-in, which checks the password and the ADMIN role.
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

function sign(exp: number): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`admin-gate.${exp}`).digest("base64url");
}

/** The cookie value after a correct key: "<expiry>.<signature>". */
export function newGateValue(): string {
  const exp = Math.floor(Date.now() / 1000) + ADMIN_GATE_TTL_SEC;
  return `${exp}.${sign(exp)}`;
}

/** Whether a request carries a valid, unexpired gate cookie (read from its Cookie header). */
export function hasAdminGate(cookieHeader: string | null | undefined): boolean {
  const raw = cookieHeader?.split(/;\s*/).find(c => c.startsWith(`${ADMIN_GATE_COOKIE}=`))?.slice(ADMIN_GATE_COOKIE.length + 1);
  if (!raw) return false;
  const [expStr, sig] = decodeURIComponent(raw).split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000 || !sig) return false;
  const expected = sign(exp);
  return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
