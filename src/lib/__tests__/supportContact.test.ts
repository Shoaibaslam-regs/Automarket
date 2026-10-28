import { describe, expect, it } from "vitest";
import { badgeRequestText, upgradeRequestText } from "@/lib/supportContact";

const user = { id: "6ae1cb05c845093aa5366abc", email: "owner@shop.pk", business: { id: "6ae1cb05c845093aa53def12", name: "Lahore Motors" } };

describe("support request texts", () => {
  it("names the business and its ID as well as the account", () => {
    const text = upgradeRequestText("Premium", 2500, user);
    expect(text).toContain('Business: "Lahore Motors" (Business ID #3def12)');
    expect(text).toContain("My ID is #366abc (owner@shop.pk)");
    expect(badgeRequestText("Lahore Motors", 500, user)).toContain("Business ID #3def12");
  });
  it("doesn't ask how to pay, since the payment details were already shown", () => {
    expect(upgradeRequestText("Premium", 2500, user)).not.toMatch(/how can i pay/i);
    expect(badgeRequestText("Lahore Motors", 500, user)).not.toMatch(/how can i pay/i);
    expect(upgradeRequestText("Premium", 2500, user)).toMatch(/send the payment receipt here\.$/);
  });
  it("works for people without a business", () => {
    const text = upgradeRequestText("Premium", 2500, { id: user.id, email: user.email });
    expect(text).not.toContain("Business");
    expect(text).toContain("My ID is #366abc");
    expect(badgeRequestText("Lahore Motors", 500, { id: user.id })).toContain('Business: "Lahore Motors"');
  });
});
