import { expect, test } from "@playwright/test";
import { seedData, signedIn } from "./helpers";

// Business → Reports is a Premium feature (PLAN_FEATURES.salesReports). The seed puts E2E Motors on Premium and
// Lapsed Motors' plan ended yesterday.

test("a Premium business sees its sales report and can change the period", async ({ browser }) => {
  const page = await signedIn(browser, seedData().users.dealer);
  await page.goto("/business/reports");
  await expect(page.getByText("Sales · This month").first()).toBeVisible();
  // The owner sees money
  await expect(page.getByRole("heading", { name: "Sales and rental income" })).toBeVisible();
  await page.getByLabel("Report period").selectOption("last-3");
  await expect(page.getByText("Sales · Last 3 months").first()).toBeVisible();
});

test("a recorded sale counts in the report at its sale price, and only for this month", async ({ browser }) => {
  const page = await signedIn(browser, seedData().users.dealer);
  const origin = new URL(page.url()).origin;
  const before = await (await page.request.get("/api/business/stats?period=this-month")).json();
  const res = await page.request.post("/api/business/sales", {
    headers: { Origin: origin },
    data: { vehicle: "other", offList: { title: "Suzuki Mehran 2018 white" }, buyer: { name: "Report Buyer", phone: "03001112233" }, price: 950000, amountPaid: 950000, sold: true },
  });
  expect(res.status()).toBe(201);
  const after = await (await page.request.get("/api/business/stats?period=this-month")).json();
  expect(after.report.sales.count).toBe(before.report.sales.count + 1);
  expect(after.report.sales.value).toBe(before.report.sales.value + 950000);
  expect(after.monthly.sales).toBe(before.monthly.sales + 1);
  const lastMonth = await (await page.request.get("/api/business/stats?period=last-month")).json();
  expect(lastMonth.report.period.label).toBe("Last month");
  expect(lastMonth.report.sales.count).toBe(0);
  expect(after.report.byMonth.at(-1).salesValue).toBeGreaterThanOrEqual(950000);
});

test("a business without the feature gets the upgrade card, and its dashboard still has its counts", async ({ browser }) => {
  const page = await signedIn(browser, seedData().users.lapsed);
  await page.goto("/business/reports");
  await expect(page.getByRole("heading", { name: "Sales reports are on Premium and up" })).toBeVisible();
  await expect(page.getByRole("link", { name: "See plans" })).toHaveAttribute("href", "/pricing");
  const res = await page.request.get("/api/business/stats");
  const body = await res.json();
  expect(res.status()).toBe(200);
  expect(body.report).toBeNull();
  expect(body.reportLocked).toEqual({ plan: "Premium" });
  expect(typeof body.inventory.totalVehicles).toBe("number");
});

test("Ultimate gets Advanced reports from its real sales, with a range, the previous period and the breakdowns", async ({ browser }) => {
  const page = await signedIn(browser, seedData().users.ultimate);
  const today = new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 10);
  const ninety = new Date(Date.now() + 5 * 3_600_000 - 89 * 86_400_000).toISOString().slice(0, 10);
  const r = await (await page.request.get(`/api/business/reports/advanced?from=${ninety}&to=${today}`)).json();
  expect(r.range.days).toBe(90);
  expect(r.current.salesCount).toBe(2);
  expect(r.current.salesValue).toBe(10300000);
  expect(r.byVehicle[0]).toMatchObject({ name: "Honda Civic 2021", make: "Honda", sales: 1, total: 6500000 });
  expect(r.byMake.map((m: { make: string }) => m.make)).toEqual(["Honda", "Toyota"]);
  expect(r.byStaff[0]).toMatchObject({ name: "Umar Ultimate", sales: 2 });
  expect(r.bySource.sales).toEqual({ online: 0, walkIn: 2 });

  await page.goto("/business/reports");
  const adv = page.getByRole("region", { name: "Advanced reports" });
  await expect(adv.getByRole("heading", { name: "Advanced reports" })).toBeVisible();
  await expect(adv.getByText("Honda Civic 2021").first()).toBeVisible();
  const download = page.waitForEvent("download");
  await adv.getByRole("button", { name: "Export CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/^autogo-report-.*\.csv$/);
});

test("Advanced reports are refused below Ultimate, with the plan named, and bad ranges are refused", async ({ browser }) => {
  const page = await signedIn(browser, seedData().users.dealer);
  const res = await page.request.get("/api/business/reports/advanced?from=2026-01-01&to=2026-01-31");
  expect(res.status()).toBe(403);
  expect(await res.json()).toMatchObject({ code: "PLAN_FEATURE", plan: "Ultimate" });
  await page.goto("/business/reports");
  await expect(page.getByText("Advanced reports are on Ultimate")).toBeVisible();
  const ult = await signedIn(browser, seedData().users.ultimate);
  expect((await ult.request.get("/api/business/reports/advanced?from=2026-05-01&to=2026-04-01")).status()).toBe(400);
});
