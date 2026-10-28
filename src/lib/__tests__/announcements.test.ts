import { describe, expect, it } from "vitest";
import { ownSitePath } from "@/lib/announcements";

describe("ownSitePath", () => {
  const hosts = ["autogo-pak.vercel.app", null];
  it("turns links to this site into paths", () => {
    expect(ownSitePath("https://autogo-pak.vercel.app/pricing", hosts)).toBe("/pricing");
    expect(ownSitePath("https://AutoGO-Pak.vercel.app/pricing?plan=PRO#top", hosts)).toBe("/pricing?plan=PRO#top");
    expect(ownSitePath("https://autogo-pak.vercel.app", hosts)).toBe("/");
  });
  it("leaves other sites and paths alone", () => {
    expect(ownSitePath("https://example.com/pricing", hosts)).toBe("https://example.com/pricing");
    expect(ownSitePath("/deals", hosts)).toBe("/deals");
    expect(ownSitePath("https://autogo-pak.vercel.app.evil.com/x", hosts)).toBe("https://autogo-pak.vercel.app.evil.com/x");
  });
});
