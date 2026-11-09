import { expect, test } from "@playwright/test";

// The phone's status bar (<meta name="theme-color">, src/lib/theme.ts THEME_BAR) matches the navbar in each theme,
// following the device and then any Light or Dark choice made in the app.
const bars = (page: import("@playwright/test").Page) =>
  page.locator('meta[name="theme-color"]').evaluateAll(ms => ms.map(m => m.getAttribute("content")));

test("the status bar is white in light mode and dark grey in dark mode", async ({ browser }) => {
  const dark = await browser.newPage({ colorScheme: "dark" });
  await dark.goto("/");
  expect(new Set(await bars(dark))).toEqual(new Set(["#242526"]));

  const light = await browser.newPage({ colorScheme: "light" });
  await light.goto("/");
  expect(new Set(await bars(light))).toEqual(new Set(["#ffffff"]));

  // A dark choice in the app wins over a light device, from the first paint of the next page too
  await light.evaluate(() => localStorage.setItem("theme", "dark"));
  await light.goto("/help");
  expect(new Set(await bars(light))).toEqual(new Set(["#242526"]));
});
