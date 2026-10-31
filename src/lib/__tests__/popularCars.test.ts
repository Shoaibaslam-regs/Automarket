import { describe, expect, it } from "vitest";
import { POPULAR_CARS, popularCarHref } from "@/lib/popularCars";
import { parseFilters } from "@/lib/listingFilters";

describe("popular cars in the footer", () => {
  it("links a make sellers can pick to the make filter, with the model as the search", () => {
    const href = popularCarHref("Toyota", "Land Cruiser");
    expect(href).toBe("/listings?make=Toyota&search=Land%20Cruiser");
    const f = parseFilters(Object.fromEntries(new URL(href, "https://x.test").searchParams));
    expect(f).toMatchObject({ make: "Toyota", search: "Land Cruiser" });
  });

  it("searches other makes as text, since sellers list them as Other", () => {
    expect(popularCarHref("Haval", "H6")).toBe("/listings?search=Haval%20H6");
  });

  it("has no repeats", () => {
    const names = POPULAR_CARS.flatMap(g => g.cars.map(([make, model]) => `${g.title}:${make} ${model}`));
    expect(new Set(names).size).toBe(names.length);
  });
});
