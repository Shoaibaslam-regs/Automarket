import { expect, test } from "@playwright/test";
import { calendarDay, dayFromToday, seedData, showMonth, signedIn, tapDay } from "./helpers";

// The booking rule end to end: requests never block dates; the owner's confirmation decides, cancels the other
// request for those days with a reason, and the days then show as booked to everyone.
test.describe.serial("two renters ask for the same dates", () => {
  const pickup = dayFromToday(3);
  const giveBack = dayFromToday(5);

  for (const who of ["renterA", "renterB"] as const) {
    test(`${who} sends a request by tapping the calendar`, async ({ browser }) => {
      const { users, rentalListingId } = seedData();
      const page = await signedIn(browser, users[who]);
      await page.goto(`/rentals/${rentalListingId}/book`);
      await tapDay(page, pickup);
      await expect(page.getByText("Now tap your return day")).toBeVisible();
      await tapDay(page, giveBack);
      // 2 days × PKR 6,000 + PKR 20,000 deposit
      await page.getByRole("button", { name: "Request booking · PKR 32,000" }).click();
      await expect(page.getByText("Booking request sent")).toBeVisible();
    });
  }

  test("the owner confirms the first renter", async ({ browser }) => {
    const { users, names } = seedData();
    const page = await signedIn(browser, users.owner);
    await page.goto("/bookings");
    await page.getByRole("button", { name: /Received requests/ }).click();
    const card = page.locator("div.overflow-hidden.rounded-2xl").filter({ hasText: names.renterA });
    await card.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(card.getByText("Confirmed", { exact: true })).toBeVisible();
    // The other request for those days was closed by the confirmation
    const other = page.locator("div.overflow-hidden.rounded-2xl").filter({ hasText: names.renterB });
    await expect(other.getByText("Cancelled", { exact: true })).toBeVisible();
  });

  test("the second renter sees why and finds the days booked on the calendar", async ({ browser }) => {
    const { users, rentalListingId } = seedData();
    const page = await signedIn(browser, users.renterB);
    await page.goto("/bookings");
    await expect(page.getByText("Dates taken")).toBeVisible();
    await expect(page.getByText(/booked by someone else/)).toBeVisible();
    await page.getByRole("link", { name: "See free dates" }).click();

    await page.waitForURL(`**/listings/${rentalListingId}#availability`);
    const calendar = page.locator("#availability");
    await showMonth(calendar, pickup);
    await expect(calendarDay(calendar, pickup)).toHaveAttribute("aria-label", /, booked$/);
    await expect(calendarDay(calendar, dayFromToday(4))).toHaveAttribute("aria-label", /, booked$/);
    // The return day is free again for the next pickup
    await expect(calendarDay(calendar, giveBack)).toHaveAttribute("aria-label", /, free(, book from this day)?$/);
  });

  test("a signed-out visitor taps a free day, signs in and lands on booking with that day picked", async ({ browser }) => {
    const { users, password, rentalListingId } = seedData();
    const later = dayFromToday(8);
    const page = await (await browser.newContext()).newPage();
    await page.goto(`/listings/${rentalListingId}`);
    const calendar = page.locator("#availability");
    await calendar.getByRole("button", { expanded: false }).click();
    await showMonth(calendar, later);
    await expect(calendar.getByText("Tap a free day to book from it")).toBeVisible();
    await calendarDay(calendar, later).click();

    await page.waitForURL(/\/login\?callbackUrl=/);
    await page.getByPlaceholder("AutoGO@email.com").fill(users.renterA);
    await page.getByPlaceholder("••••••••").fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL(`**/rentals/${rentalListingId}/book?start=${later}`);
    await expect(page.getByText("Now tap your return day")).toBeVisible();
    await tapDay(page, dayFromToday(10));
    await page.getByRole("button", { name: "Request booking · PKR 32,000" }).click();
    await expect(page.getByText("Booking request sent")).toBeVisible();
  });

  test("a booked day can't be picked for a new request", async ({ browser }) => {
    const { users, rentalListingId } = seedData();
    const page = await signedIn(browser, users.renterB);
    await page.goto(`/rentals/${rentalListingId}/book`);
    await tapDay(page, pickup);
    await expect(page.getByText("That day is already booked. Choose a free day.")).toBeVisible();
  });
});
