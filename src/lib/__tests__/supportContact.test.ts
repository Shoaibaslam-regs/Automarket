import { describe, expect, it } from "vitest";
import { badgeRequestText, paymentInstructionsText, upgradeRequestText } from "@/lib/supportContact";

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

describe("paymentInstructionsText", () => {
  it("names the plan and amount and lists only the filled-in payment fields", () => {
    const text = paymentInstructionsText("Premium", 499, { accountTitle: "AutoGO Pvt Ltd", bankName: "Meezan Bank", iban: " PK36MEZN0000000000000000 ", jazzcash: "", note: "Use your Business ID as the reference" });
    expect(text).toContain("pay PKR 499 for 30 days");
    expect(text).toContain("Thanks for choosing Premium");
    expect(text).toContain("IBAN: PK36MEZN0000000000000000");
    expect(text).not.toContain("JazzCash");
    expect(text).toContain("Use your Business ID as the reference");
    expect(text.split("\n").at(-1)).toMatch(/send the payment receipt/);
  });
});
