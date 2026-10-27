// What a new password must be (sign-up, reset, change in Profile). Client-safe and unit-tested.
// Existing passwords that don't meet it still sign in; the rule applies when a password is set.

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/** Passwords tried first in every guessing attack (common worldwide and in Pakistan), compared without case. */
const COMMON = new Set([
  "password", "password1", "password123", "passw0rd", "12345678", "123456789", "1234567890", "11111111", "00000000",
  "12341234", "87654321", "qwertyui", "qwerty123", "asdfghjk", "abcd1234", "abc12345", "iloveyou", "letmein1",
  "welcome1", "admin123", "pakistan", "pakistan1", "pakistan123", "pakistan786", "lahore123", "karachi123",
  "islamabad", "allah786", "bismillah", "786786786", "khan1234", "ali12345", "autogo123", "automarket",
]);

/** Why this password can't be used, or null when it's fine. `email`/`name` stop the obvious choices. */
export function passwordProblem(password: unknown, { email, name }: { email?: string; name?: string } = {}): string | null {
  if (typeof password !== "string" || !password) return "Choose a password";
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters for your password`;
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters for your password`;
  const lower = password.toLowerCase();
  if (COMMON.has(lower) || /^(.)\1+$/.test(password)) return "That password is too easy to guess. Try a longer phrase or mix in words and numbers";
  const local = email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) return "Don't use your email in your password";
  const first = name?.trim().split(/\s+/)[0]?.toLowerCase();
  if (first && first.length >= 4 && lower === first + lower.slice(first.length) && /^\d*$/.test(lower.slice(first.length))) {
    return "Don't use just your name (and numbers) as your password";
  }
  return null;
}
