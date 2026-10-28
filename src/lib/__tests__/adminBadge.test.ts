import { describe, expect, it } from "vitest";
import { adminBadgeKind } from "@/lib/adminBadge";

describe("adminBadgeKind", () => {
  it("gives full admins the blue tick, including those without an access level", () => {
    expect(adminBadgeKind({ role: "ADMIN", adminAccess: "FULL" })).toBe("full");
    expect(adminBadgeKind({ role: "ADMIN" })).toBe("full");
  });
  it("gives managers, and the old view-only admins, the grey tick", () => {
    expect(adminBadgeKind({ role: "ADMIN", adminAccess: "MANAGER" })).toBe("manager");
    expect(adminBadgeKind({ role: "ADMIN", adminAccess: "READ_ONLY" })).toBe("manager");
  });
  it("gives the AutoGO Support account the blue tick", () => {
    expect(adminBadgeKind({ role: "USER", isSupportAccount: true })).toBe("full");
  });
  it("gives everyone else none", () => {
    expect(adminBadgeKind({ role: "USER" })).toBeNull();
    expect(adminBadgeKind({ role: "SELLER", adminAccess: "FULL" })).toBeNull();
    expect(adminBadgeKind(null)).toBeNull();
    expect(adminBadgeKind(undefined)).toBeNull();
  });
});
