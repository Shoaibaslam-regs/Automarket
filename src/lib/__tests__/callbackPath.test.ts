import { describe, expect, it } from "vitest";
import { loginFor, safeCallbackPath } from "@/lib/callbackPath";

describe("safeCallbackPath", () => {
  it("follows paths on this site", () => {
    expect(safeCallbackPath("/rentals/abc/book?start=2026-11-05")).toBe("/rentals/abc/book?start=2026-11-05");
    expect(safeCallbackPath("/bookings")).toBe("/bookings");
  });
  it("never leaves the site", () => {
    expect(safeCallbackPath("https://evil.example")).toBe("/dashboard");
    expect(safeCallbackPath("//evil.example/x")).toBe("/dashboard");
    expect(safeCallbackPath("/\\evil.example")).toBe("/dashboard");
    expect(safeCallbackPath("javascript:alert(1)")).toBe("/dashboard");
  });
  it("falls back to the dashboard for nothing, or the sign-in pages themselves", () => {
    expect(safeCallbackPath(null)).toBe("/dashboard");
    expect(safeCallbackPath("")).toBe("/dashboard");
    expect(safeCallbackPath("/login?x=1")).toBe("/dashboard");
  });
  it("builds the login link", () => {
    expect(loginFor("/rentals/abc/book?start=2026-11-05")).toBe("/login?callbackUrl=%2Frentals%2Fabc%2Fbook%3Fstart%3D2026-11-05");
  });
});

describe("password pages", () => {
  it("are never a place to come back to", () => {
    expect(safeCallbackPath("/forgot-password")).toBe("/dashboard");
    expect(safeCallbackPath("/reset-password?token=abc")).toBe("/dashboard");
    expect(safeCallbackPath("/register#top")).toBe("/dashboard");
  });
});
