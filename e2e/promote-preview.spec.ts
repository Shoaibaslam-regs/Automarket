import { expect, test } from "@playwright/test";
import { seedData, signedIn } from "./helpers";

// Business → Promote's preview (components/business/AdPreview.tsx, GET /api/business/ads/preview): the card an ad
// would get, built like the live ads, in the home row or between Marketplace results, with tips for what's missing.
// E2E Motors has no logo, no description and no Verified badge, and one live rent deal.
test("a business sees its sponsored card before asking for an ad, with tips to improve it", async ({ browser }) => {
  const page = await signedIn(browser, seedData().users.dealer);
  await page.goto("/business/promote");
  const preview = page.getByRole("region", { name: "Ad preview" }).locator("visible=true");

  // The business page is chosen first: its card, where it shows, and what to fix
  await expect(preview.getByText("E2E Motors", { exact: true })).toBeVisible();
  await expect(preview.getByText("Rent a car · Karachi")).toBeVisible();
  await expect(preview.getByText("Featured businesses")).toBeVisible();
  await expect(preview.getByRole("link", { name: /Add a logo/ })).toHaveAttribute("href", "/business/settings");
  await expect(preview.getByRole("link", { name: /Write a short description/ })).toBeVisible();
  await expect(preview.getByRole("link", { name: /About the Verified badge/ })).toBeVisible();

  // Between Marketplace results instead
  await preview.getByRole("button", { name: "Marketplace" }).click();
  await expect(preview.getByText(/Between search results with a thin gold border/)).toBeVisible();
  await expect(preview.getByText("E2E Motors", { exact: true })).toBeVisible();

  // A deal: its own card, with its discounted price per day; nothing was sent
  await page.getByRole("button", { name: "Deal", exact: true }).click();
  await expect(preview.getByText("Choose a deal to see its card")).toBeVisible();
  await page.getByRole("combobox", { name: "Deal" }).click();
  await page.getByRole("option", { name: "Wedding convoy package" }).click();
  await expect(preview.getByText("Wedding convoy package")).toBeVisible();
  await expect(preview.getByText("24,000")).toBeVisible();
  await expect(page.getByText("No ads yet")).toBeVisible();

  // Someone else's vehicle can't be previewed
  const other = await page.request.get(`/api/business/ads/preview?kind=LISTING&targetId=${seedData().rentalListingId}`);
  expect(other.status()).toBe(404);
});
