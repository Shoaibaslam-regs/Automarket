import { defineConfig, devices } from "@playwright/test";

// Browser tests (e2e/*.spec.ts). `npm run test:e2e` starts e2e/server.ts: an in-memory MongoDB with test data and
// a production build of the app on port 3100, so they never touch the real database or a running dev server.
const PORT = process.env.E2E_PORT || "3100";

export default defineConfig({
  testDir: "./e2e",
  // The booking flow passes one test's result to the next, and every test shares one seeded database
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx tsx e2e/server.ts",
    url: `http://127.0.0.1:${PORT}/api/health`,
    // The first run builds the app
    timeout: 10 * 60_000,
    reuseExistingServer: false,
    stdout: "pipe",
    gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
  },
});
