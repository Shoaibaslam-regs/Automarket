import { expect, test } from "@playwright/test";
import { seedData, signedIn } from "./helpers";

// Registering a business on a paid plan (src/app/(business)/business/onboarding): the business is live at once, the
// payment details show where the plan is picked, the dashboard says the request is waiting (PlanRequestNote), every
// console page works straight away (the console used to say "No business registered" until a reload), and AutoGO
// Support's automatic reply in Messages carries the amount and the account.
test("a new business picks Premium, sees where to pay, and its console works at once", async ({ browser }) => {
  test.setTimeout(90_000);
  const page = await signedIn(browser, seedData().users.newbiz);
  await page.goto("/business/onboarding");
  await page.waitForLoadState("networkidle");

  await page.getByText("Car Dealer", { exact: true }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.locator('input[name="name"]').fill("Nadia Motors");
  await page.getByRole("combobox", { name: "City" }).click();
  await page.getByRole("option", { name: "Karachi" }).first().click();
  await page.getByRole("button", { name: /Continue/ }).click();

  // Picking Premium shows what to pay and where, right on this step
  await page.getByRole("radio", { name: /^Premium/ }).first().click();
  await expect(page.getByText("How to pay")).toBeVisible();
  await expect(page.getByText("PK00TEST0000000000000000")).toBeVisible();
  await expect(page.getByText(/Premium: PKR 499 for 30 days/)).toBeVisible();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /Launch my business/ }).click();
  await page.waitForURL("**/business/dashboard", { timeout: 20_000 });

  // The dashboard says the request is waiting, with the payment details one tap away
  const note = page.getByRole("region", { name: "Plan request" });
  await expect(note.getByText("Premium requested · waiting for payment")).toBeVisible();
  await note.getByRole("button", { name: /How to pay/ }).click();
  await expect(note.getByText("PK00TEST0000000000000000")).toBeVisible();

  // Every console page works without a reload
  await page.getByRole("link", { name: "Inventory" }).first().click();
  await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();
  await expect(page.getByText("No business registered")).toHaveCount(0);

  // AutoGO Support has already answered with the amount and the account
  await page.goto("/business/dashboard");
  await page.getByRole("region", { name: "Plan request" }).getByRole("link", { name: /Send receipt/ }).click();
  await page.waitForURL(/\/messages/);
  await expect(page.getByText(/please pay PKR 499 for 30 days/).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/IBAN: PK00TEST0000000000000000/).first()).toBeVisible();
});
