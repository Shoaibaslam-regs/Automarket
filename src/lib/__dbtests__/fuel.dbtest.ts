import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FuelPrice } from "@/models/FuelPrice";
import { FuelPriceUpdate } from "@/models/FuelPriceUpdate";
import { checkFuelNotices } from "@/lib/fuelJobs";
import mongoose from "mongoose";
import { parseDay } from "@/lib/fuelPrices";
import { clearOldFuelPrices } from "@/lib/fuelAdmin";
import { AdminLog } from "@/models/AdminLog";

// The OGRA price check (src/lib/fuelJobs.ts) with OGRA's site replaced by saved copies of its 4 and 5 Nov 2026
// publications: normal days go live by themselves, odd ones wait for an admin, and nothing is read twice.
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url));
const LIST = `<h4>Price Publications (Period November 2026)</h4>
  <p>Price Publication Effective Dated November 05, 2026 <a href="https://ogra.org.pk/index.php/download/17955?lang=en">EN</a></p>
  <p>Price Publications Effective Dated November 04, 2026 <a href="https://ogra.org.pk/index.php/download/17909?lang=en">EN</a></p>`;
const now = new Date("2026-11-05T06:00:00Z");
const approve = (day: string, petrol: number, diesel: number) => FuelPrice.create([
  { fuelType: "PETROL", price: petrol, effectiveDate: parseDay(day), source: "test", approvedAt: new Date() },
  { fuelType: "DIESEL", price: diesel, effectiveDate: parseDay(day), source: "test", approvedAt: new Date() },
]);

beforeEach(async () => {
  await Promise.all([FuelPrice.deleteMany({}), FuelPriceUpdate.deleteMany({})]);
  delete process.env.FUEL_AUTO_PUBLISH;
  vi.stubGlobal("fetch", async (input: string | URL) => {
    const url = String(input);
    if (url.includes("price-publications")) return new Response(LIST, { headers: { "content-type": "text/html; charset=utf-8" } });
    if (url.includes("/download/17909")) return new Response(fixture("ogra-2026-11-04.pdf"), { headers: { "content-type": "application/pdf" } });
    if (url.includes("/download/17955")) return new Response(fixture("ogra-2026-11-05.pdf"), { headers: { "content-type": "application/pdf" } });
    return new Response("not found", { status: 404 });
  });
});
afterEach(() => vi.unstubAllGlobals());

const price = async (day: string, fuel: "PETROL" | "DIESEL") => (await FuelPrice.findOne({ fuelType: fuel, effectiveDate: parseDay(day) }).lean<{ price: number; autoPublished?: boolean }>());

describe("OGRA price check", () => {
  it("publishes normal days by itself, oldest first, with OGRA's exact prices, and reads nothing twice", async () => {
    await approve("2026-11-03", 374.51, 395.2);
    const counts = await checkFuelNotices(now);
    expect(counts).toMatchObject({ source: "OGRA", published: 2, pending: 0, failed: 0 });
    expect(await price("2026-11-04", "PETROL")).toMatchObject({ price: 369.06, autoPublished: true });
    expect((await price("2026-11-05", "PETROL"))?.price).toBe(362);
    expect((await price("2026-11-05", "DIESEL"))?.price).toBe(387.81);
    expect(await FuelPriceUpdate.countDocuments({ status: "APPROVED", autoPublished: true })).toBe(2);

    const again = await checkFuelNotices(now);
    expect(again).toMatchObject({ pending: 0, failed: 0 });
    expect(again.published ?? 0).toBe(0);
    expect(await FuelPriceUpdate.countDocuments()).toBe(2);
  });

  it("holds the very first price and big jumps for an admin, with the reason", async () => {
    // No approved day before 4 Nov: held; 5 Nov then compares with nothing approved either
    await checkFuelNotices(now);
    const held = await FuelPriceUpdate.find({ status: "PENDING" }).lean();
    expect(held).toHaveLength(2);
    expect(held[0].extractionDetails?.held).toMatch(/No earlier approved prices/);
    expect(await FuelPrice.countDocuments()).toBe(0);

    await Promise.all([FuelPrice.deleteMany({}), FuelPriceUpdate.deleteMany({})]);
    await approve("2026-11-03", 300, 395.2); // petrol 300 → 369.06 is a 23% jump
    await checkFuelNotices(now);
    const jump = await FuelPriceUpdate.findOne({ listedDay: "2026-11-04" }).lean();
    expect(jump?.status).toBe("PENDING");
    expect(jump?.extractionDetails?.held).toMatch(/Petrol moved/);
  });

  it("sends every day to an admin when FUEL_AUTO_PUBLISH=0", async () => {
    process.env.FUEL_AUTO_PUBLISH = "0";
    await approve("2026-11-03", 374.51, 395.2);
    expect(await checkFuelNotices(now)).toMatchObject({ pending: 2 });
    expect(await FuelPrice.countDocuments({ autoPublished: true })).toBe(0);
  });
});

describe("Removing old price history", () => {
  const admin = { _id: new mongoose.Types.ObjectId(), email: "admin@e2e.test" };

  it("deletes days older than two months, keeps the rest, and logs it", async () => {
    await approve("2026-08-01", 300, 310);
    await approve("2026-09-05", 320, 330);
    await approve("2026-09-06", 321, 331);
    await approve("2026-11-04", 369.06, 390);
    expect(await clearOldFuelPrices(admin, 60, now)).toBe(2);
    const left = (await FuelPrice.distinct("effectiveDate")).map(d => new Date(d).toISOString()).sort();
    expect(left).toEqual([parseDay("2026-09-06")!.toISOString(), parseDay("2026-11-04")!.toISOString()]);
    expect(await AdminLog.countDocuments({ action: "fuel.clearPrices" })).toBe(1);
    expect(await clearOldFuelPrices(admin, 60, now)).toBe(0);
  });

  it("never removes the latest published day, however old", async () => {
    await approve("2026-07-01", 300, 310);
    await approve("2026-07-02", 301, 311);
    expect(await clearOldFuelPrices(admin, 60, now)).toBe(1);
    expect(await price("2026-07-02", "PETROL")).toMatchObject({ price: 301 });
  });
});
