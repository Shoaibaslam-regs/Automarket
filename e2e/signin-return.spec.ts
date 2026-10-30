import { expect, test, type Page } from "@playwright/test";
import { seedData, signedIn } from "./helpers";

// Every "Sign in" brings the visitor back to what they were doing; only Register from the menus ends at the
// dashboard (src/lib/callbackPath.ts, components/auth/SignInLink.tsx).

async function fillSignIn(page: Page, email: string) {
  await page.waitForURL(/\/login\?callbackUrl=/);
  await page.getByPlaceholder("AutoGO@email.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(seedData().password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("'Sign in to book online' on a rental goes straight to its booking page", async ({ page }) => {
  const { users, rentalListingId } = seedData();
  await page.goto(`/listings/${rentalListingId}`);
  await page.getByRole("link", { name: "Sign in to book online" }).click();
  await fillSignIn(page, users.renterA);
  await page.waitForURL(`**/rentals/${rentalListingId}/book`);
  await expect(page.getByRole("heading", { name: "Book this vehicle" })).toBeVisible();
});

test("the navbar's Sign in returns to the same page, filters included", async ({ page }) => {
  const { users } = seedData();
  await page.goto("/listings?make=Honda&location=Karachi");
  await page.locator("nav").getByRole("link", { name: "Sign in", exact: true }).click();
  await fillSignIn(page, users.renterB);
  await page.waitForURL(url => url.pathname === "/listings" && url.searchParams.get("make") === "Honda" && url.searchParams.get("location") === "Karachi");
});

test("'Create one' on the way to a booking keeps the destination; the navbar's Register doesn't have one", async ({ page }) => {
  const { rentalListingId } = seedData();
  await page.goto(`/listings/${rentalListingId}`);
  await page.getByRole("link", { name: "Sign in to book online" }).click();
  await page.waitForURL(/\/login\?callbackUrl=/);
  await page.getByRole("link", { name: "Create one" }).click();
  await page.waitForURL(url => url.pathname === "/register" && url.searchParams.get("callbackUrl") === `/rentals/${rentalListingId}/book`);

  await page.goto("/");
  await expect(page.locator("nav").getByRole("link", { name: "Register", exact: true })).toHaveAttribute("href", "/register");
});

test("an already signed-in visitor skips the sign-in page and goes where the link pointed", async ({ browser }) => {
  const page = await signedIn(browser, seedData().users.renterA);
  await page.goto("/login?callbackUrl=%2Fbookings");
  await page.waitForURL("**/bookings");
  // A link to another site is never followed
  await page.goto("/login?callbackUrl=https%3A%2F%2Fevil.example");
  await page.waitForURL("**/dashboard");
});
