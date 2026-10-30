import { expect, test } from "@playwright/test";

// The search-landing pages Google sends people to (src/lib/seoPages.ts), built from the seeded listings:
// four Civics (60–70 lakh) and an Alto (25 lakh) for sale in Karachi, a Corolla for rent and a rent deal there.

test("a city page shows its real numbers and links to narrower searches", async ({ page }) => {
  await page.goto("/cars-for-sale/karachi");
  await expect(page.getByRole("heading", { level: 1, name: "Cars for sale in Karachi" })).toBeVisible();
  await expect(page.getByText(/^5 cars for sale in Karachi from PKR 25 lakh to PKR 70 lakh\. Most listed: Honda, Suzuki\./)).toBeVisible();
  await expect(page).toHaveTitle(/Cars for sale in Karachi: 5 used and new cars with prices/);

  await page.getByRole("link", { name: "Honda cars for sale", exact: true }).click();
  await page.waitForURL("**/cars-for-sale/karachi/honda");
  await expect(page.getByRole("heading", { level: 1, name: "Honda cars for sale in Karachi" })).toBeVisible();
  await expect(page.getByText(/^4 Honda cars for sale in Karachi/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Filter all 4 on Browse/ })).toHaveAttribute("href", "/listings?type=SALE&location=Karachi&make=Honda");
});

test("a rent page lists rentals and the city's rent deals", async ({ page }) => {
  await page.goto("/rent-a-car/karachi");
  await expect(page.getByRole("heading", { level: 1, name: "Rent a car in Karachi" })).toBeVisible();
  await expect(page.getByText(/^1 vehicle for rent in Karachi at PKR 6,000 a day\./)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rent deals in Karachi" })).toBeVisible();
  await expect(page.getByText("Wedding convoy package")).toBeVisible();
});

test("unknown cities and makes are not pages", async ({ page }) => {
  expect((await page.goto("/cars-for-sale/atlantis"))?.status()).toBe(404);
  expect((await page.goto("/cars-for-sale/karachi/flyingcar"))?.status()).toBe(404);
});

test("the sitemap lists the landing pages and the footer links to them", async ({ page, request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/cars-for-sale/karachi/honda");
  expect(sitemap).toContain("/rent-a-car/karachi");
  await page.goto("/");
  await expect(page.locator("footer").getByRole("link", { name: "Cars for sale in Karachi" })).toHaveAttribute("href", "/cars-for-sale/karachi");
});
