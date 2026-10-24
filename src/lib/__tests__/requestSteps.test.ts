import { describe, expect, it } from "vitest";
import { bookingSteps, purchaseSteps } from "@/lib/requestSteps";

describe("bookingSteps", () => {
  it("follows the booking from request to return", () => {
    expect(bookingSteps("PENDING")?.reached).toBe(0);
    expect(bookingSteps("CONFIRMED")?.reached).toBe(1);
    expect(bookingSteps("ACTIVE")?.reached).toBe(2);
    expect(bookingSteps("COMPLETED")?.reached).toBe(3);
  });
  it("has no line for a cancelled booking", () => {
    expect(bookingSteps("CANCELLED")).toBeNull();
  });
});

describe("purchaseSteps", () => {
  it("follows the request to the sale", () => {
    expect(purchaseSteps("REQUESTED")?.reached).toBe(0);
    expect(purchaseSteps("ACCEPTED")?.reached).toBe(1);
    expect(purchaseSteps("COMPLETED")?.reached).toBe(2);
  });
  it("has no line for a declined or cancelled request", () => {
    expect(purchaseSteps("DECLINED")).toBeNull();
    expect(purchaseSteps("CANCELLED")).toBeNull();
  });
});
