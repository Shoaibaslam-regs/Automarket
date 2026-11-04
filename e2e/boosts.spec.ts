import { expect, test } from "@playwright/test";
import { seedData, signedIn } from "./helpers";

// Plan perks (src/lib/boosts.ts, src/lib/boostServer.ts, PLAN_FEATURES in src/lib/plans.ts): Ultimate Motors boosts a
// vehicle from Inventory (it leads Marketplace with the Featured star and uses one of 50 boosts) and pins it on its shop
// page; the Premium dealer gets no boosts, no pins and a locked Money page. The vehicle is a Land Cruiser in Islamabad,
// so the Karachi and Honda counts other specs check stay the same.

test("Ultimate boosts and pins a vehicle; Premium can't, and its Money page is locked", async ({ browser }) => {
  const s = seedData();
  const page = await signedIn(browser, s.users.ultimate);
  const origin = new URL(page.url()).origin;

  const created = await page.request.post("/api/listings", {
    headers: { Origin: origin },
    data: {
      title: "Toyota Land Cruiser ZX 2023", description: "Islamabad registered, dealer maintained, full options.", price: 950_000_00,
      type: "SALE", condition: "EXCELLENT", make: "Toyota", model: "Land Cruiser", year: 2023, location: "Islamabad", mileage: 12000,
    },
  });
  expect(created.status()).toBe(201);
  const listingId = String((await created.json()).listing._id);

  const before = await (await page.request.get("/api/boosts")).json();
  expect(before).toMatchObject({ allowed: true, perMonth: 50, days: 30, canBoost: true });

  // Boost and pin from Inventory
  await page.goto("/business/inventory");
  await expect(page.getByText(`${before.left} of 50`)).toBeVisible();
  const card = page.locator("div.rounded-2xl").filter({ hasText: "Toyota Land Cruiser ZX 2023" }).filter({ has: page.getByRole("link", { name: "View" }) });
  await card.getByRole("button", { name: "Boost" }).click();
  await expect(page.getByText(`${before.left - 1} of 50`)).toBeVisible();
  await expect(card.getByRole("button", { name: "Boost" })).toHaveCount(0);
  await card.getByRole("button", { name: "Pin on shop page" }).click();
  await expect(card.getByRole("button", { name: "Unpin from shop page" })).toBeVisible();

  // Boosting it again is refused
  const again = await page.request.post("/api/boosts", { headers: { Origin: origin }, data: { listingId } });
  expect(again.status()).toBe(409);

  // It leads Marketplace with the Featured star, and shows Pinned on the shop page
  const feed = await (await page.request.get("/api/listings?make=Toyota")).json();
  expect(String(feed.listings[0]._id)).toBe(listingId);
  expect(feed.listings[0].boosted).toBe(true);
  await page.goto("/dealers/ultimate-motors");
  await expect(page.getByTitle("Pinned by the business").first()).toBeVisible();
  // The Featured star comes from the boost date itself, so it shows outside Marketplace too (home, shop page, similar)
  await expect(page.locator("a, article, div").filter({ hasText: "Toyota Land Cruiser ZX 2023" }).getByTitle("Featured").first()).toBeVisible();

  // Premium: no boosts, no pins, Money locked
  const dealer = await signedIn(browser, s.users.dealer);
  const status = await (await dealer.request.get("/api/boosts")).json();
  expect(status.allowed).toBe(false);
  const refused = await dealer.request.post("/api/boosts", { headers: { Origin: origin }, data: { listingId } });
  expect(refused.status()).toBe(403);
  const pin = await dealer.request.patch(`/api/business/listings/${listingId}/pin`, { headers: { Origin: origin }, data: { pinned: true } });
  expect(pin.status()).toBe(403);
  await dealer.goto("/business/money");
  await expect(dealer.getByText(/Money & profit tracking is on Premium Plus and up/)).toBeVisible();
});
