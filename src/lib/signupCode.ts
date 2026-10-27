// Sign-up codes and sign-in identifiers. Client-safe and unit-tested.
//
// A new account confirms itself with a 6-digit code sent to its email (or by SMS to its phone when SMS is set
// up); after that it signs in with its email or its verified phone number and its password.

import { normalizePkMobile } from "@/lib/phone";

export const SIGNUP_CODE_LENGTH = 6;
export const SIGNUP_CODE_MINUTES = 10;
/** Wrong guesses allowed per code; after that a new code must be sent. */
export const SIGNUP_CODE_TRIES = 5;
/** Seconds before "Send a new code" can be pressed again. */
export const RESEND_AFTER_SECONDS = 60;

export type CodeChannel = "email" | "phone";

/** Just the digits of a typed code, or null when it isn't a whole code. */
export function cleanCode(input: unknown): string | null {
  if (typeof input !== "string" && typeof input !== "number") return null;
  const digits = String(input).replace(/\D/g, "");
  return digits.length === SIGNUP_CODE_LENGTH ? digits : null;
}

/**
 * What was typed in the sign-in field: an email, a Pakistani mobile number (as +92…), or neither.
 * Phone numbers are 10–13 digits with optional +, spaces and dashes; anything else without "@" is neither
 * (the login page then treats it as the hidden admin key).
 */
export function parseLoginIdentifier(input: unknown): { kind: "email"; email: string } | { kind: "phone"; phone: string } | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (value.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? { kind: "email", email: value.toLowerCase() } : null;
  if (!/^\+?[\d\s-]{10,16}$/.test(value)) return null;
  const phone = normalizePkMobile(value);
  return phone ? { kind: "phone", phone } : null;
}

/** "a***r@gmail.com" / "+92 30* *** 4567": where the code went, without spelling it all out. */
export function maskDestination(channel: CodeChannel, value: string): string {
  if (channel === "email") {
    const [user, domain] = value.split("@");
    if (!domain) return value;
    return `${user[0] ?? ""}${"*".repeat(Math.max(1, user.length - 2))}${user.length > 1 ? user[user.length - 1] : ""}@${domain}`;
  }
  const digits = value.replace(/\D/g, "");
  return `+${digits.slice(0, 2)} ${digits.slice(2, 4)}* *** ${digits.slice(-4)}`;
}
