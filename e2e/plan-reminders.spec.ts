import { expect, test } from "@playwright/test";
import { seedData, signedIn } from "./helpers";

// Plan reminders in the console, and the rule that a business never falls back to Free (src/lib/businessPlan.ts).
// The seed puts E2E Motors on Premium ending in 3 days, and Lapsed Motors' Premium ended yesterday.

test("opening the console slides a reminder down from the top, once per session, with Renew", async ({ browser }) => {
  const page = await signedIn(browser, seedData().users.dealer);
  await page.goto("/business/dashboard");
  const toast = page.locator(".am-plan-toast");
  await expect(toast).toContainText("Your Premium plan ends in 3 days");
  // The dashboard banner says the same, and Renew opens the payment details with the plan chosen
  await page.locator(".am-plan-toast").getByRole("button", { name: "Dismiss" }).click();
  await expect(toast).toBeHidden();
  await page.getByRole("button", { name: "Renew now" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("Premium");
  await page.keyboard.press("Escape");
  // Not again on the next console page in the same session
  await page.goto("/business/customers");
  await page.waitForTimeout(1500);
  await expect(toast).toHaveCount(0);
});

test("Notifications lists the plan ending", async ({ browser }) => {
  const page = await signedIn(browser, seedData().users.dealer);
  await page.goto("/notifications");
  await expect(page.getByText("Your Premium plan ends in 3 days")).toBeVisible();
});

test("the sidebar plan card and the guide explain the plan", async ({ browser }) => {
  const page = await signedIn(browser, seedData().users.dealer);
  await page.goto("/business/guide");
  await expect(page.getByText(/Premium plan\s*3d left/)).toBeVisible();
  await expect(page.getByText(/restarts|resets/)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Your plan" })).toBeVisible();
});

test("a lapsed business sees why, and can't add new customers, but the console still works", async ({ browser }) => {
  const page = await signedIn(browser, seedData().users.lapsed);
  await page.goto("/business/customers");
  await expect(page.getByText(/Your Premium plan has ended\. Nothing new can be added until you subscribe/)).toBeVisible();
  await expect(page.getByText("Plan ended", { exact: true })).toBeVisible();
  const res = await page.request.post("/api/business/customers", {
    data: { name: "Walk-in Customer", phone: "03001234567", source: "WALK_IN" },
    headers: { Origin: new URL(page.url()).origin },
  });
  expect(res.status()).toBe(403);
  const body = await res.json();
  expect(body).toMatchObject({ code: "PLAN_LIMIT_REACHED", lapsed: true });
  expect(body.error).toMatch(/Subscribe to a plan to add new customers/);
});
