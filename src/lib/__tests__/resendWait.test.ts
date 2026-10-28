import { describe, expect, it } from "vitest";
import { RESEND_RESET_SECONDS, resendWaitAfter, secondsUntilResend, streakCount } from "@/lib/resendWait";

const now = Date.UTC(2026, 9, 29, 10, 0, 0);
const ago = (s: number) => new Date(now - s * 1000);

describe("resend wait", () => {
  it("grows 1, 2, 5, then 10 minutes", () => {
    expect([1, 2, 3, 4, 9].map(resendWaitAfter)).toEqual([60, 120, 300, 600, 600]);
    expect(resendWaitAfter(0)).toBe(0);
  });
  it("counts down from the last code", () => {
    expect(secondsUntilResend(1, ago(20), now)).toBe(40);
    expect(secondsUntilResend(2, ago(20), now)).toBe(100);
    expect(secondsUntilResend(3, ago(60), now)).toBe(240);
    expect(secondsUntilResend(1, ago(61), now)).toBe(0);
  });
  it("starts again after a quiet hour", () => {
    expect(streakCount(4, ago(RESEND_RESET_SECONDS), now)).toBe(0);
    expect(secondsUntilResend(4, ago(RESEND_RESET_SECONDS + 5), now)).toBe(0);
    expect(streakCount(4, ago(RESEND_RESET_SECONDS - 5), now)).toBe(4);
  });
  it("allows the first code straight away", () => {
    expect(secondsUntilResend(undefined, undefined, now)).toBe(0);
    expect(secondsUntilResend(0, ago(5), now)).toBe(0);
  });
});
