import { expect, test } from "@playwright/test";
import { seedData, signedIn } from "./helpers";

// The pricing page's Verified badge card (components/subscription/VerifiedBadgeOffer.tsx): a business sees its own
// name there, with the tick only once its badge is approved. E2E Motors has no badge.

const card = (page: import("@playwright/test").Page) => page.locator("section").filter({ has: page.getByRole("heading", { name: "Verified badge" }) });

test("visitors without a business see the add-on line", async ({ page }) => {
  await page.goto("/pricing");
  await expect(card(page).getByText("Add-on for businesses")).toBeVisible();
  await expect(card(page).locator('[title="Verified business: checked by the AutoGO team"]')).toHaveCount(1);
});

test("a business sees its own name, without a tick until it is verified", async ({ browser }) => {
  const page = await signedIn(browser, seedData().users.dealer);
  await page.goto("/pricing");
  const c = card(page);
  await expect(c.getByText("E2E Motors", { exact: true })).toBeVisible();
  await expect(c.getByText("Add-on for businesses")).toHaveCount(0);
  await expect(c.getByText("Zain Dealer")).toHaveCount(0);
  // The Verified pill carries this title; it shows only for an approved, running badge
  await expect(c.locator('[title="Verified business: checked by the AutoGO team"]')).toHaveCount(0);
});

test("a verified business sees its name with the Verified tick", async ({ browser }) => {
  const page = await signedIn(browser, seedData().users.ultimate);
  await page.goto("/pricing");
  const c = card(page);
  // The top line (the note under it also names the business: "Ultimate Motors is verified until …")
  await expect(c.locator("span", { hasText: /^Ultimate Motors$/ })).toBeVisible();
  await expect(c.getByText(/is verified until/)).toBeVisible();
  await expect(c.locator('[title="Verified business: checked by the AutoGO team"]')).toHaveCount(1);
  await expect(c.getByText("Add-on for businesses")).toHaveCount(0);
});
