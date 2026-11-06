import { expect, test } from "@playwright/test";
import { seedData, signedIn } from "./helpers";

// Following a shop (src/lib/shopFollowServer.ts): Follow on the shop page, the shop in Saved, its announcement in
// Notifications, mute and unfollow; guests are sent to sign in and the shop's own team sees no button.
const SHOP = "/dealers/ultimate-motors";

test("guests are asked to sign in, and the shop's own team sees no Follow button", async ({ page, browser }) => {
  await page.goto(SHOP);
  await expect(page.getByRole("link", { name: /Follow/ })).toBeVisible();
  const owner = await signedIn(browser, seedData().users.ultimate);
  await owner.goto(SHOP);
  await expect(owner.getByRole("button", { name: "Share" }).first()).toBeVisible();
  await expect(owner.getByRole("button", { name: /^Follow$/ })).toHaveCount(0);
});

test("a follower sees the shop in Saved and its announcements in Notifications, until they mute or unfollow it", async ({ browser }) => {
  test.setTimeout(90_000);
  const s = seedData();
  const fan = await signedIn(browser, s.users.renterA);
  const owner = await signedIn(browser, s.users.ultimate);
  const origin = new URL(owner.url()).origin;
  const post = (title: string) => owner.request.post("/api/business/notices", { headers: { Origin: origin }, data: { kind: "NEWS", title } });

  await fan.goto(SHOP);
  await fan.getByRole("button", { name: /^Follow$/ }).click();
  await expect(fan.getByRole("button", { name: /Following/ })).toBeVisible();
  await expect(fan.getByRole("button", { name: "Mute Ultimate Motors" })).toBeVisible();

  await fan.goto("/saved");
  const shops = fan.locator("#shops");
  await expect(shops.getByRole("heading", { name: "Shops you follow (1)" })).toBeVisible();
  await expect(shops.getByRole("link", { name: /Ultimate Motors/ })).toBeVisible();

  // The shop posts: the follower sees it in Notifications, and a tap opens the shop
  expect((await post("New stock arriving this week")).status()).toBe(201);
  await fan.goto("/notifications");
  const item = fan.getByRole("link", { name: /Ultimate Motors: New stock arriving this week/ });
  await expect(item).toBeVisible();
  await expect(item).toHaveAttribute("href", SHOP);

  // Muted: still listed in Saved, but its next post doesn't reach Notifications
  await fan.goto("/saved");
  await shops.getByRole("button", { name: "Mute Ultimate Motors" }).click();
  await expect(shops.getByRole("button", { name: "Unmute Ultimate Motors" })).toBeVisible();
  expect((await post("Weekend test drives")).status()).toBe(201);
  await fan.goto("/notifications");
  await expect(fan.getByText(/Weekend test drives/)).toHaveCount(0);

  // Unfollow from Saved
  await fan.goto("/saved");
  await shops.getByRole("button", { name: "Unfollow Ultimate Motors" }).click();
  await expect(shops.getByText("No shops followed yet")).toBeVisible();
});
