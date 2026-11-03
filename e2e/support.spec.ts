import { expect, test } from "@playwright/test";
import { seedData, signedIn } from "./helpers";

// Priority support (src/lib/supportPriority.ts) is for Premium Plus and up. The seed's E2E Motors is on Premium.

test("a Premium business is told Priority support starts at Premium Plus", async ({ browser }) => {
  const page = await signedIn(browser, seedData().users.dealer);
  await page.goto("/business/support");
  await expect(page.getByText(/Premium Plus and up get Priority support, with replies within 4 hours/)).toBeVisible();
  await expect(page.getByText("Priority support.", { exact: true })).toHaveCount(0);
});

test("the Support inbox and its Priority list are for admins only", async ({ request }) => {
  expect((await request.get("/api/admin/support?filter=priority")).status()).toBe(401);
  expect((await request.get("/api/admin/support?count=1")).status()).toBe(401);
});

test("Dedicated support is for Ultimate: a Premium business has none, and outsiders can't ask", async ({ browser, request }) => {
  expect((await request.get("/api/business/account-manager")).status()).toBe(401);
  const page = await signedIn(browser, seedData().users.dealer);
  const res = await page.request.get("/api/business/account-manager");
  expect(await res.json()).toEqual({ dedicated: false });
  await page.goto("/business/support");
  await expect(page.getByText("Dedicated support.", { exact: true })).toHaveCount(0);
});
