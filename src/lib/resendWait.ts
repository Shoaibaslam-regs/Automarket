// How long someone waits before another code can be emailed. Client-safe and unit-tested; the server enforces it
// (src/lib/signupCodes.ts, src/lib/adminCode.ts) and the forms show the countdown.
//
// The wait grows with each code sent in a row: 1 minute after the first, then 2, 5 and 10 minutes. A quiet hour
// starts the count again. The hourly cap on emails per address still applies on top.

/** Seconds to wait after the 1st, 2nd, 3rd and every later code. */
export const RESEND_WAITS = [60, 120, 300, 600] as const;
/** After this long without a code, the next resend counts as the first again. */
export const RESEND_RESET_SECONDS = 60 * 60;

/** The wait after `sent` codes in a row (1 = the first code). */
export function resendWaitAfter(sent: number): number {
  if (sent <= 0) return 0;
  return RESEND_WAITS[Math.min(sent, RESEND_WAITS.length) - 1];
}

/** Codes sent in a row so far, counting the streak as over after a quiet hour. */
export function streakCount(sent: number | null | undefined, lastSentAt: Date | string | null | undefined, now = Date.now()): number {
  if (!sent || !lastSentAt) return 0;
  return now - new Date(lastSentAt).getTime() >= RESEND_RESET_SECONDS * 1000 ? 0 : sent;
}

/** Seconds until another code may be sent (0 = now). */
export function secondsUntilResend(sent: number | null | undefined, lastSentAt: Date | string | null | undefined, now = Date.now()): number {
  const streak = streakCount(sent, lastSentAt, now);
  if (!streak || !lastSentAt) return 0;
  const readyAt = new Date(lastSentAt).getTime() + resendWaitAfter(streak) * 1000;
  return Math.max(0, Math.ceil((readyAt - now) / 1000));
}
