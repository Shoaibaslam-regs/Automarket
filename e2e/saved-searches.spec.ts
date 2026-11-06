import { expect, test } from "@playwright/test";
import { seedData, signedIn } from "./helpers";

// Saved searches: Save search on Browse, the list on /saved (alerts on/off, delete), no duplicates, and the email
// alert when a new listing matches (src/lib/savedSearchAlerts.ts; email is off in tests, so `lastNotifiedAt` shows it).
// The new listing is a Kia in Multan, so the Karachi and Honda counts other specs check stay the same.

type Saved = { _id: string; name: string; filters: Record<string, unknown>; emailAlerts: boolean; lastNotifiedAt?: string };

test("a saved search is listed, can be switched off and on, isn't saved twice, alerts on a match, and can be deleted", async ({ browser }) => {
  const s = seedData();
  const page = await signedIn(browser, s.users.renterA);
  const origin = new URL(page.url()).origin;

  // Save from Browse
  await page.goto("/listings?make=Kia&location=Multan");
  await page.getByRole("button", { name: "Save search" }).click();
  await expect(page.getByRole("button", { name: "Alert on" })).toBeVisible();

  // The same filters again: no second copy
  const again = await page.request.post("/api/saved-searches", { headers: { Origin: origin }, data: { filters: { make: "Kia", location: "Multan" } } });
  expect((await again.json()).duplicate).toBe(true);
  // A second, different search that the new listing won't match
  await page.request.post("/api/saved-searches", { headers: { Origin: origin }, data: { filters: { make: "BMW" } } });
  let list: Saved[] = (await (await page.request.get("/api/saved-searches")).json()).searches;
  expect(list.filter(x => x.filters.make === "Kia")).toHaveLength(1);

  // /saved lists both, and the alert switch works
  await page.goto("/saved");
  // Each saved search is one rounded card
  const row = (make: string) => page.locator("div.rounded-xl").filter({ hasText: make }).filter({ has: page.getByRole("button", { name: "Delete saved search" }) });
  const kia = row("Kia");
  await expect(kia.getByText("Email alerts on")).toBeVisible();
  await kia.getByRole("button", { name: "Turn off email alerts" }).click();
  await expect(kia.getByText("Alerts off")).toBeVisible();
  await page.reload();
  await expect(kia.getByText("Alerts off")).toBeVisible();
  await kia.getByRole("button", { name: "Turn on email alerts" }).click();
  await expect(kia.getByText("Email alerts on")).toBeVisible();

  // Someone else lists a matching vehicle: the Kia search is alerted, the BMW one isn't
  const seller = await signedIn(browser, s.users.renterB);
  const res = await seller.request.post("/api/listings", {
    headers: { Origin: origin },
    data: {
      title: "Kia Sportage 2022 AWD", description: "Family SUV, one owner, full service history.", price: 8_500_000,
      type: "SALE", condition: "EXCELLENT", make: "Kia", model: "Sportage", year: 2022, location: "Multan", mileage: 30000,
    },
  });
  expect(res.status()).toBe(201);
  await expect.poll(async () => {
    list = (await (await page.request.get("/api/saved-searches")).json()).searches;
    return !!list.find(x => x.filters.make === "Kia")?.lastNotifiedAt;
  }, { timeout: 10_000 }).toBe(true);
  expect(list.find(x => x.filters.make === "BMW")?.lastNotifiedAt).toBeUndefined();

  // Delete
  await page.goto("/saved");
  await row("BMW").getByRole("button", { name: "Delete saved search" }).click();
  await expect(page.getByRole("link", { name: /BMW/ })).toHaveCount(0);
  // The row leaves the screen at once; wait for the server to have deleted it too
  await expect.poll(async () => ((await (await page.request.get("/api/saved-searches")).json()).searches as Saved[]).some(x => x.filters.make === "BMW"), { timeout: 10_000 }).toBe(false);
});

test("signed-out visitors are sent to sign in, and come back to the same search", async ({ page }) => {
  await page.goto("/listings?make=Kia");
  await page.getByRole("button", { name: "Save search" }).click();
  await page.waitForURL(/\/login\?callbackUrl=/);
  expect(decodeURIComponent(page.url())).toContain("/listings?make=Kia");
  expect((await page.request.get("/api/saved-searches")).status()).toBe(401);
});
