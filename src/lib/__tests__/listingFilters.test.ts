import { describe, expect, it } from "vitest";
import { describeFilters, listingMatches, parseFilters } from "@/lib/listingFilters";

// listingMatches decides which saved searches get an email for a new listing (src/lib/savedSearchAlerts.ts), so it
// must agree with Browse's query (buildListingQuery): contains-match on make, city and search, exact fuel and gearbox.
const kia = {
  title: "Kia Sportage 2022 AWD", make: "Kia", model: "Sportage", location: "DHA, Lahore", type: "SALE", condition: "EXCELLENT",
  price: 8_500_000, year: 2022, mileage: 30000, fuelType: "Petrol", transmission: "Automatic",
};

describe("listingMatches", () => {
  it("matches on make, city (contained) and search, case aside", () => {
    expect(listingMatches(kia, parseFilters({ make: "kia", location: "lahore" }))).toBe(true);
    expect(listingMatches(kia, parseFilters({ search: "sportage" }))).toBe(true);
    expect(listingMatches(kia, parseFilters({ make: "Honda" }))).toBe(false);
    expect(listingMatches(kia, parseFilters({ location: "Karachi" }))).toBe(false);
  });

  it("checks price, year and mileage ranges", () => {
    expect(listingMatches(kia, parseFilters({ maxPrice: "9000000", minYear: "2020" }))).toBe(true);
    expect(listingMatches(kia, parseFilters({ maxPrice: "8000000" }))).toBe(false);
    expect(listingMatches(kia, parseFilters({ minYear: "2023" }))).toBe(false);
    expect(listingMatches(kia, parseFilters({ maxMileage: "20000" }))).toBe(false);
    // A listing with no mileage can't promise to be under a mileage limit
    expect(listingMatches({ ...kia, mileage: undefined }, parseFilters({ maxMileage: "50000" }))).toBe(false);
  });

  it("checks type, condition, fuel and gearbox exactly", () => {
    expect(listingMatches(kia, parseFilters({ type: "SALE", fuelType: "petrol", transmission: "automatic" }))).toBe(true);
    expect(listingMatches(kia, parseFilters({ type: "RENT" }))).toBe(false);
    expect(listingMatches(kia, parseFilters({ condition: "GOOD" }))).toBe(false);
    expect(listingMatches(kia, parseFilters({ fuelType: "Diesel" }))).toBe(false);
  });

  it("names a search from its filters", () => {
    expect(describeFilters(parseFilters({ make: "Kia", location: "Multan" }))).toBe("Kia · Multan");
  });
});
