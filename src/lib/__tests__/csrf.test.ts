import { describe, expect, it } from "vitest";
import { isCrossSiteWrite } from "@/lib/csrf";

const h = (o: Record<string, string>) => ({ get: (n: string) => o[n.toLowerCase()] ?? null });

describe("isCrossSiteWrite", () => {
  it("lets reads through from anywhere", () => {
    expect(isCrossSiteWrite("GET", h({ origin: "https://evil.example", host: "autogo.pk" }))).toBe(false);
  });
  it("allows writes from this site", () => {
    expect(isCrossSiteWrite("POST", h({ origin: "https://autogo.pk", host: "autogo.pk" }))).toBe(false);
    expect(isCrossSiteWrite("POST", h({ origin: "http://localhost:3001", host: "localhost:3001" }))).toBe(false);
    expect(isCrossSiteWrite("PATCH", h({ origin: "https://autogo.pk", "x-forwarded-host": "autogo.pk", host: "internal:3000" }))).toBe(false);
  });
  it("refuses writes from another site", () => {
    expect(isCrossSiteWrite("POST", h({ origin: "https://evil.example", host: "autogo.pk" }))).toBe(true);
    expect(isCrossSiteWrite("DELETE", h({ "sec-fetch-site": "cross-site", host: "autogo.pk" }))).toBe(true);
    expect(isCrossSiteWrite("POST", h({ origin: "null", host: "autogo.pk" }))).toBe(true);
    expect(isCrossSiteWrite("POST", h({ origin: "https://autogo.pk.evil.example", host: "autogo.pk" }))).toBe(true);
  });
  it("lets server-to-server calls without browser headers through", () => {
    expect(isCrossSiteWrite("POST", h({ host: "autogo.pk" }))).toBe(false);
  });
});
