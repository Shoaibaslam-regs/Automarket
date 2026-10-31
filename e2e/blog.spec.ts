import { expect, test } from "@playwright/test";

// The public blog: the navbar link, the list with its starter guides, a category, and a post.
test("the navbar's Blog link opens the blog with the starter guides", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation").getByRole("link", { name: "Blog", exact: true }).first().click();
  await page.waitForURL("**/blog");
  await expect(page.getByRole("heading", { name: "Guides for every drive" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Buying a used car in Pakistan: the complete checklist/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /How to avoid scams/ })).toBeVisible();
});

test("a category shows only its posts", async ({ page }) => {
  await page.goto("/blog");
  await page.getByRole("navigation", { name: "Categories" }).getByRole("link", { name: "Safety" }).click();
  await page.waitForURL("**/blog?category=SAFETY");
  await expect(page.getByRole("link", { name: /How to avoid scams/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Buying a used car/ })).toHaveCount(0);
});

test("a post shows its headings, lists and tips, and more posts to read", async ({ page }) => {
  await page.goto("/blog/used-car-buying-checklist-pakistan");
  await expect(page.getByRole("heading", { level: 1, name: "Buying a used car in Pakistan: the complete checklist" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The documents" })).toBeVisible();
  await expect(page.getByText("Never buy a car on photocopies")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Token tax paid up to date" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Keep reading" })).toBeVisible();
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(ld!)[0]["@type"]).toBe("Article");
});

test("unknown posts are a 404", async ({ page }) => {
  const res = await page.goto("/blog/no-such-post");
  expect(res?.status()).toBe(404);
});
