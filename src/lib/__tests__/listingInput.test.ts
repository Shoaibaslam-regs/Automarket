import { describe, expect, it } from "vitest";
import { LISTING_LIMITS, parseListingFields, parseRentalFields } from "@/lib/listingInput";

const NOW = new Date("2026-10-27T10:00:00Z");
const good = {
  title: "Toyota Corolla GLi 2018", description: "Family used, one owner, well kept.", price: "3500000",
  type: "SALE", condition: "GOOD", make: "Toyota", model: "Corolla", year: 2018, mileage: "85,000", location: "Lahore",
};

describe("parseListingFields (new listing)", () => {
  it("accepts a normal listing and cleans numbers", () => {
    const r = parseListingFields(good, { now: NOW });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.price).toBe(3_500_000);
      expect(r.value.mileage).toBe(85_000);
      expect(r.value.title).toBe("Toyota Corolla GLi 2018");
    }
  });
  it("refuses missing, negative, absurd and wrong-type values", () => {
    expect(parseListingFields({ ...good, title: undefined }, { now: NOW }).ok).toBe(false);
    expect(parseListingFields({ ...good, price: -5 }, { now: NOW }).ok).toBe(false);
    expect(parseListingFields({ ...good, price: LISTING_LIMITS.maxPrice + 1 }, { now: NOW }).ok).toBe(false);
    expect(parseListingFields({ ...good, year: 9999 }, { now: NOW }).ok).toBe(false);
    expect(parseListingFields({ ...good, year: 2027 }, { now: NOW }).ok).toBe(true);
    expect(parseListingFields({ ...good, year: 2018.5 }, { now: NOW }).ok).toBe(false);
    expect(parseListingFields({ ...good, mileage: -1 }, { now: NOW }).ok).toBe(false);
    expect(parseListingFields({ ...good, title: { $gt: "" } }, { now: NOW }).ok).toBe(false);
    expect(parseListingFields({ ...good, type: "AUCTION" }, { now: NOW }).ok).toBe(false);
  });
  it("caps text lengths and photo counts", () => {
    expect(parseListingFields({ ...good, description: "x".repeat(LISTING_LIMITS.description + 1) }, { now: NOW }).ok).toBe(false);
    expect(parseListingFields({ ...good, images: Array.from({ length: 21 }, (_, i) => `https://utfs.io/f/${i}`) }, { now: NOW }).ok).toBe(false);
    expect(parseListingFields({ ...good, images: [1, 2] }, { now: NOW }).ok).toBe(false);
  });
});

describe("parseListingFields (edit)", () => {
  it("checks only the fields that were sent", () => {
    const r = parseListingFields({ price: 2_900_000 }, { partial: true, now: NOW });
    expect(r).toEqual({ ok: true, value: { price: 2_900_000 } });
    expect(parseListingFields({ price: 0 }, { partial: true, now: NOW }).ok).toBe(false);
  });
});

describe("parseRentalFields", () => {
  it("needs a positive daily rate and a deposit of 0 or more", () => {
    expect(parseRentalFields({ dailyRate: 5000 }, NOW)).toMatchObject({ ok: true, value: { dailyRate: 5000, deposit: 0 } });
    expect(parseRentalFields({ dailyRate: -100 }, NOW).ok).toBe(false);
    expect(parseRentalFields({ dailyRate: 5000, deposit: -1 }, NOW).ok).toBe(false);
    expect(parseRentalFields({ dailyRate: 5000, availableFrom: "not a date" }, NOW).ok).toBe(false);
    expect(parseRentalFields({ dailyRate: 5000, availableFrom: "2026-11-10", availableTo: "2026-11-01" }, NOW).ok).toBe(false);
  });
});
