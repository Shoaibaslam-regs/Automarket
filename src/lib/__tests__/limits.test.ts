import { describe, expect, it } from "vitest";
import { countdownText, waitText } from "@/lib/waitText";
import { sameCity } from "@/lib/ads";

describe("waitText", () => {
  it("uses the largest sensible unit and rounds up", () => {
    expect(waitText(1)).toBe("1 second");
    expect(waitText(45)).toBe("45 seconds");
    expect(waitText(61)).toBe("2 minutes");
    expect(waitText(3600)).toBe("1 hour");
    expect(waitText(30 * 3600)).toBe("30 hours");
  });
  it("says days for the monthly feedback limit", () => {
    expect(waitText(48 * 3600)).toBe("2 days");
    expect(waitText(30 * 24 * 3600)).toBe("30 days");
    expect(waitText(12 * 24 * 3600 + 5)).toBe("13 days"); // never promises too early
  });
});

describe("countdownText", () => {
  it("counts down minutes and seconds", () => {
    expect(countdownText(0)).toBe("0:00");
    expect(countdownText(872)).toBe("14:32");
  });
  it("switches to hours, then days", () => {
    expect(countdownText(2 * 3600 + 5 * 60)).toBe("2h 05m");
    expect(countdownText(20 * 24 * 3600)).toBe("20 days");
  });
});

describe("sameCity", () => {
  it("ignores case and spaces", () => {
    expect(sameCity("Lahore", " lahore ")).toBe(true);
    expect(sameCity("Lahore", "Karachi")).toBe(false);
  });
  it("never matches a missing city", () => {
    expect(sameCity("", "")).toBe(false);
    expect(sameCity(undefined, "Lahore")).toBe(false);
  });
});
