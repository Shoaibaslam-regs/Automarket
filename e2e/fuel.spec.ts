import { devices, expect, test } from "@playwright/test";

// The public Fuel prices page (approved test prices from e2e/seed.ts) and the doors that must stay shut.
test("the fuel page shows approved Pakistani prices with their change and the trends, and no crude oil", async ({ page }) => {
  await page.goto("/fuel-prices");
  await expect(page.getByRole("heading", { level: 1, name: "Fuel prices" })).toBeVisible();
  await expect(page.getByText(/^Updated \d{1,2} \w{3} \d{4}$/).first()).toBeVisible();
  const main = page.getByRole("main");
  await expect(main.getByText("396.65").first()).toBeVisible();
  await expect(main.getByText("394.94").first()).toBeVisible();
  await expect(main.getByText("+PKR 1.82").first()).toBeVisible();
  await expect(main.getByRole("heading", { name: "Price changes" })).toBeVisible();
  // Brent and WTI were removed (no free source gave current prices)
  await expect(main.getByText(/Brent|WTI|per barrel/)).toHaveCount(0);
  // Crypto-style charts: a series tab, ranges, and the area drawn
  await expect(main.locator(".recharts-area").first()).toBeVisible();
  await main.getByRole("tab", { name: "Diesel" }).click();
  await expect(main.getByRole("tab", { name: "Diesel" })).toHaveAttribute("aria-selected", "true");
  await main.getByRole("radio", { name: "7D" }).first().click();
  await expect(main.getByRole("radio", { name: "7D" }).first()).toHaveAttribute("aria-checked", "true");
});

test("the blog links to today's fuel prices", async ({ page }) => {
  await page.goto("/blog");
  const strip = page.getByRole("link", { name: /Fuel prices.*See prices/ });
  await expect(strip).toContainText("396.65");
  await strip.click();
  await page.waitForURL("**/fuel-prices");
});

test("admin and scheduled fuel addresses refuse outsiders", async ({ request }) => {
  expect((await request.get("/api/admin/fuel")).status()).toBe(401);
  expect((await request.patch("/api/admin/fuel/abc", { data: { action: "approve" }, headers: { Origin: "http://127.0.0.1:3100" } })).status()).toBe(401);
  const day = "/api/admin/fuel/day/2026-10-30";
  expect((await request.patch(day, { data: { petrol: 1, diesel: 1 }, headers: { Origin: "http://127.0.0.1:3100" } })).status()).toBe(401);
  expect((await request.delete(day, { data: { note: "test" }, headers: { Origin: "http://127.0.0.1:3100" } })).status()).toBe(401);
  const cron = await request.get("/api/cron/fuel");
  expect([401, 503]).toContain(cron.status());
});

test.describe("on a phone", () => {
  // A phone's screen and touch, without changing the browser (as e2e/public.spec.ts does)
  const { viewport, userAgent, deviceScaleFactor } = devices["Pixel 7"];
  test.use({ viewport, userAgent, deviceScaleFactor, isMobile: true, hasTouch: true });
  test("the fuel page fits the screen", async ({ page }) => {
    await page.goto("/fuel-prices");
    await expect(page.getByText("396.65").first()).toBeVisible();
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
  });
});
