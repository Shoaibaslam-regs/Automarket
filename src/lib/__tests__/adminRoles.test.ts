import { describe, expect, it } from "vitest";
import { adminCan, normalizeAdminAccess } from "@/lib/adminRoles";

describe("admin roles", () => {
  it("reads older access levels", () => {
    expect(normalizeAdminAccess(undefined)).toBe("FULL");
    expect(normalizeAdminAccess("FULL")).toBe("FULL");
    expect(normalizeAdminAccess("READ_ONLY")).toBe("MANAGER");
    expect(normalizeAdminAccess("MANAGER")).toBe("MANAGER");
  });
  it("lets managers do the day-to-day work", () => {
    for (const p of ["plans", "badges", "businesses", "reports", "ads", "announcements"] as const) expect(adminCan("MANAGER", p)).toBe(true);
  });
  it("keeps admins, users, listings, deals and settings with full admins", () => {
    for (const p of ["admins", "users", "listings", "deals", "settings"] as const) {
      expect(adminCan("MANAGER", p)).toBe(false);
      expect(adminCan("FULL", p)).toBe(true);
    }
  });
  it("refuses when the access level isn't known yet", () => {
    expect(adminCan(null, "plans")).toBe(false);
  });
});
