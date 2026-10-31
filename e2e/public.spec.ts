import { devices, expect, test } from "@playwright/test";
import { seedData } from "./helpers";

// Pages anyone can open, without signing in.

test("smart search on the home page opens Browse with the filters it read", async ({ page }) => {
  await page.goto("/");
  const box = page.getByRole("combobox", { name: "Search vehicles" });
  await box.fill("Find Honda Civic under 70 lac in Karachi, automatic transmission.");
  await expect(page.getByText("Smart search", { exact: true })).toBeVisible();
  await box.press("Enter");

  await page.waitForURL(/\/listings\?/);
  const url = new URL(page.url());
  expect(url.searchParams.get("make")).toBe("Honda");
  expect(url.searchParams.get("maxPrice")).toBe("7000000");
  expect(url.searchParams.get("location")).toBe("Karachi");
  expect(url.searchParams.get("transmission")).toBe("Automatic");
  // The four seeded Civics are 60 to 70 lakh
  await expect(page.getByText(/^4 vehicles found$/)).toBeVisible();
});

test("listing page shows the breadcrumb, ad ID and market price check", async ({ page }) => {
  const { civicId } = seedData();
  await page.goto(`/listings/${civicId}`);
  const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(crumbs).toContainText("Honda");
  await expect(crumbs).toContainText("Civic");
  // Inside main: while the page streams in, React briefly holds a hidden second copy of the content
  await expect(page.getByRole("main").getByText(civicId.slice(-6).toUpperCase(), { exact: true })).toBeVisible();
  // 65 lakh against the other Civics' median of 62 lakh is within 7%
  await expect(page.getByRole("heading", { name: "Market price check" })).toBeVisible();
  await expect(page.getByText("Fair price")).toBeVisible();
});

test("the availability calendar opens and closes", async ({ page }) => {
  const { rentalListingId } = seedData();
  await page.goto(`/listings/${rentalListingId}`);
  const toggle = page.locator("#availability").getByRole("button", { expanded: false });
  await toggle.click();
  await expect(page.getByRole("button", { name: "Next month" })).toBeVisible();
  await page.locator("#availability").getByRole("button", { expanded: true }).click();
  await expect(page.getByRole("button", { name: "Next month" })).toBeHidden();
});

test("Send feedback in the footer loads and opens its dialog", async ({ page }) => {
  // The dialog's code loads on the first press (FeedbackHost), so this checks the lazy load opens it at once
  await page.goto("/");
  await page.locator("footer").getByRole("button", { name: "Send feedback" }).click();
  const dialog = page.getByRole("dialog", { name: "Send feedback" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Sign in so we can reply to you.")).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
});

test.describe("on a phone", () => {
  // A phone's screen, touch and browser name (not its browser type, which a group can't switch)
  const { viewport, userAgent, deviceScaleFactor } = devices["Pixel 7"];
  test.use({ viewport, userAgent, deviceScaleFactor, isMobile: true, hasTouch: true });

  test("the photo viewer closes with ×, and with the phone's Back button without leaving the page", async ({ page }) => {
    const { rentalListingId } = seedData();
    await page.goto(`/listings/${rentalListingId}`);
    const viewer = page.getByRole("dialog", { name: /photo 1 of 2/ });

    await page.getByRole("button", { name: "View photos full screen" }).click();
    await expect(viewer).toBeVisible();
    await page.getByRole("button", { name: "Close photos" }).click();
    await expect(viewer).toBeHidden();

    await page.getByRole("button", { name: "View photos full screen" }).click();
    await expect(viewer).toBeVisible();
    await page.goBack();
    await expect(viewer).toBeHidden();
    expect(new URL(page.url()).pathname).toBe(`/listings/${rentalListingId}`);
  });

  test("the menu button opens and closes the menu drawer", async ({ page }) => {
    // The drawer's code loads in the background (Navbar), so the first tap must still open it
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const drawer = page.getByRole("dialog", { name: "Menu" });
    await expect(drawer).toBeVisible();
    await drawer.getByRole("button", { name: "Close menu" }).click();
    await expect(drawer).toBeHidden();
  });

  test("a rent deal has the bottom bar with Book deal and WhatsApp", async ({ page }) => {
    const { dealId } = seedData();
    await page.goto(`/deals/${dealId}`);
    const bar = page.locator("div.fixed.bottom-0").filter({ hasText: "Book deal" });
    await expect(bar).toBeVisible();
    await expect(bar.getByRole("link", { name: "WhatsApp" })).toBeVisible();
    await expect(bar).toContainText("You save");
  });
});

test("the footer's popular cars open as dropdowns and lead to Browse filtered to that car", async ({ page }) => {
  await page.goto("/");
  const footer = page.locator("footer");
  const civic = footer.getByRole("link", { name: "Honda Civic" });
  await expect(civic).toBeHidden();
  await footer.getByText("Japanese cars").click();
  await civic.click();
  await page.waitForURL("**/listings?make=Honda&search=Civic");
  await expect(page.getByRole("main").getByText("Honda Civic Oriel").first()).toBeVisible();
});
