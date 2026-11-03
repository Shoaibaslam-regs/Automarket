import { expect, test } from "@playwright/test";

// The Deals page's city filter (src/lib/dealCities.ts). The seed has one live deal, in Karachi.

test("every city can be picked, with its number of deals", async ({ page }) => {
  await page.goto("/deals?city=");
  await page.getByRole("combobox", { name: "City" }).click();
  await expect(page.getByRole("option", { name: "Karachi (1)" })).toBeVisible();
  await page.getByRole("option", { name: "Hyderabad", exact: true }).click();
  await page.waitForURL(/city=Hyderabad/);
  // Hyderabad has none, so Sindh's deals come first
  await expect(page.getByRole("status").filter({ hasText: "No deals in Hyderabad yet" })).toContainText("Showing deals in Sindh first");
  await expect(page.getByText("Wedding convoy package")).toBeVisible();
});

test("a city far from every deal shows the rest of Pakistan", async ({ page }) => {
  await page.goto("/deals?city=Peshawar");
  await expect(page.getByRole("status").filter({ hasText: "No deals in Peshawar yet" })).toContainText("Showing deals from across Pakistan");
  await expect(page.getByText("Wedding convoy package")).toBeVisible();
});

test("the city chosen on Browse is used, and All cities stays all", async ({ page }) => {
  await page.goto("/deals?city=");
  await page.evaluate(() => localStorage.setItem("my-city", "Lahore"));
  await page.goto("/deals");
  await page.waitForURL(/city=Lahore/);
  await expect(page.getByText("No deals in Lahore yet")).toBeVisible();
  await page.getByRole("combobox", { name: "City" }).click();
  await page.getByRole("option", { name: "All cities" }).click();
  await page.waitForURL(/city=(&|$)/);
  await expect(page.getByText(/No deals in/)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("my-city"))).toBe("");
});
