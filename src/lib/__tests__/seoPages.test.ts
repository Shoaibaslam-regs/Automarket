import { describe, expect, it } from "vitest";
import { browseHref, cityFromSlug, cityOfLocation, makeFromSlug, seoHeading, seoIntro, seoPath, seoTitle, slugify } from "@/lib/seoPages";

describe("slugs", () => {
  it("turns names into lower-case hyphenated slugs and back", () => {
    expect(slugify("Dera Ismail Khan")).toBe("dera-ismail-khan");
    expect(cityFromSlug("karachi")).toBe("Karachi");
    expect(cityFromSlug("dera-ismail-khan")).toBe("Dera Ismail Khan");
    expect(cityFromSlug("pakistan")).toBeNull();
    expect(cityFromSlug("atlantis")).toBeUndefined();
    expect(makeFromSlug("honda")).toBe("Honda");
    expect(makeFromSlug("other")).toBeUndefined();
  });
  it("builds paths for every kind of page", () => {
    expect(seoPath({ kind: "sale", city: "Karachi", make: null })).toBe("/cars-for-sale/karachi");
    expect(seoPath({ kind: "sale", city: "Karachi", make: "Honda" })).toBe("/cars-for-sale/karachi/honda");
    expect(seoPath({ kind: "sale", city: null, make: "Honda" })).toBe("/cars-for-sale/pakistan/honda");
    expect(seoPath({ kind: "rent", city: "Lahore", make: null })).toBe("/rent-a-car/lahore");
  });
});

describe("cityOfLocation", () => {
  it("finds the city inside a free-text location", () => {
    expect(cityOfLocation("DHA Phase 6, Karachi")).toBe("Karachi");
    expect(cityOfLocation("lahore")).toBe("Lahore");
    expect(cityOfLocation("Dera Ismail Khan")).toBe("Dera Ismail Khan");
    expect(cityOfLocation("Somewhere else")).toBeNull();
  });
  it("matches whole words only", () => {
    // "Hub" (Balochistan) must not match inside other words
    expect(cityOfLocation("Hubli road")).toBeNull();
  });
});

describe("page text", () => {
  const civics = { kind: "sale" as const, city: "Karachi", make: "Honda" };
  it("names the page", () => {
    expect(seoHeading(civics)).toBe("Honda cars for sale in Karachi");
    expect(seoHeading({ kind: "sale", city: null, make: null })).toBe("Cars for sale in Pakistan");
    expect(seoHeading({ kind: "rent", city: "Lahore", make: null })).toBe("Rent a car in Lahore");
    expect(seoTitle(civics, 12)).toBe("Honda cars for sale in Karachi: 12 listings with prices");
  });
  it("describes the real numbers", () => {
    expect(seoIntro(civics, { count: 4, minPrice: 6_000_000, maxPrice: 7_000_000, topMakes: [] }))
      .toMatch(/^4 Honda cars for sale in Karachi from PKR 60 lakh to PKR 70 lakh\./);
    expect(seoIntro({ kind: "rent", city: "Lahore", make: null }, { count: 1, minPrice: 6000, maxPrice: 6000, topMakes: ["Toyota"] }))
      .toMatch(/^1 vehicle for rent in Lahore at PKR 6,000 a day\. Most listed: Toyota\./);
    expect(seoIntro(civics, { count: 0, minPrice: null, maxPrice: null, topMakes: [] })).toMatch(/^No Honda cars are listed/);
  });
  it("links to the same search on Browse", () => {
    expect(browseHref(civics)).toBe("/listings?type=SALE&location=Karachi&make=Honda");
  });
});
