import crypto from "node:crypto";

/** How long a code works, and how many wrong tries it allows. */
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

/** Hash of a code, tied to the user and the server secret, so a database leak doesn't reveal working codes. */
export function hashOtp(code: string, userId: string) {
  return crypto.createHash("sha256").update(`${code}:${userId}:${process.env.NEXTAUTH_SECRET ?? ""}`).digest("hex");
}

/** A random 6-digit code ("042117"). */
export function newOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}
