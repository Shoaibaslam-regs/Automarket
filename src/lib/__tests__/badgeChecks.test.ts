import { describe, expect, it } from "vitest";
import { badgeChecks, type BadgeFacts } from "@/lib/badgeChecks";

const good: BadgeFacts = { phone: true, address: true, city: true, logo: true, description: true, liveListings: 3, liveDeals: 1, openReports: 0, ageDays: 40 };

describe("badgeChecks", () => {
  it("passes a complete, established business", () => {
    expect(badgeChecks(good).every(c => c.ok)).toBe(true);
  });
  it("flags what's missing, with the details an admin needs", () => {
    const checks = badgeChecks({ ...good, city: false, liveListings: 0, liveDeals: 0, openReports: 2, ageDays: 1 });
    const failed = checks.filter(c => !c.ok).map(c => c.label);
    expect(failed).toEqual(["Address and city added", "Has live vehicles or deals", "No open reports", "On AutoGO for 7 days or more"]);
    expect(checks.find(c => c.label === "No open reports")?.detail).toBe("2 open in Admin → Reports");
  });
});
