import { expect, test } from "@playwright/test";
import { seedData, signedIn } from "./helpers";

// The pricing page's Verified badge card (components/subscription/VerifiedBadgeOffer.tsx): a business sees its own
// name there, with the tick only once its badge is approved. E2E Motors has no badge.

const card = (page: import("@playwright/test").Page) => page.locator("section").filter({ has: page.getByRole("heading", { name: "Verified badge" }) });

test("visitors without a business see the add-on line", async ({ page }) => {
  await page.goto("/pricing");
  await expect(card(page).getByText("For businesses, as an add-on")).toBeVisible();
  await expect(card(page).locator('[title="Verified business: checked by the AutoGO team"]')).toHaveCount(1);
});

test("a business sees its own name, without a tick until it is verified", async ({ browser }) => {
  const page = await signedIn(browser, seedData().users.dealer);
  await page.goto("/pricing");
  const c = card(page);
  await expect(c.getByText("E2E Motors", { exact: true })).toBeVisible();
  await expect(c.getByText("For businesses, as an add-on")).toHaveCount(0);
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
  await expect(c.getByText("For businesses, as an add-on")).toHaveCount(0);
});

test("asking for the badge shows where to pay, and AutoGO Support answers with the amount and the account", async ({ browser }) => {
  const page = await signedIn(browser, seedData().users.dealer);
  await page.goto("/pricing");
  const c = card(page);
  await c.getByRole("button", { name: "Request Verified badge" }).click();
  await expect(c.getByText(/Request sent on/)).toBeVisible();
  await expect(c.getByText("PK00TEST0000000000000000")).toBeVisible();
  await expect(c.getByText(/Verified badge: PKR 499 for one month/)).toBeVisible();
  await c.getByRole("link", { name: /Open Messages/ }).click();
  await page.waitForURL(/\/messages/);
  await expect(page.getByText(/please pay PKR 499 for one month/).first()).toBeVisible({ timeout: 15_000 });
});
