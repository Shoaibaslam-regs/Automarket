import { describe, expect, it } from "vitest";
import { countByCity, dealCityOptions, dealRegion, isNearby, knownCity, nearbyFirst } from "@/lib/dealCities";

describe("dealRegion", () => {
  it("finds the province, with Islamabad counted with Punjab", () => {
    expect(dealRegion("Hyderabad")?.name).toBe("Sindh");
    expect(dealRegion("lahore")?.name).toBe("Punjab & Islamabad");
    expect(dealRegion("Islamabad")?.cities).toContain("Rawalpindi");
    expect(dealRegion("Rawalpindi")?.cities).toContain("Islamabad");
    expect(dealRegion("Atlantis")).toBeNull();
  });
});

describe("nearby deals", () => {
  it("puts the region's deals first and keeps the order", () => {
    const deals = [{ id: 1, location: "Lahore" }, { id: 2, location: "Karachi" }, { id: 3, location: "Sukkur" }, { id: 4, location: "Peshawar" }];
    expect(nearbyFirst(deals, "Hyderabad").map(d => d.id)).toEqual([2, 3, 1, 4]);
    expect(nearbyFirst(deals, "Islamabad").map(d => d.id)).toEqual([1, 2, 3, 4]);
    expect(isNearby("Hyderabad", "Hyderabad")).toBe(false);
  });
});

describe("city picker", () => {
  it("offers every city, those with deals first with their count", () => {
    const counts = countByCity(["Karachi", "karachi ", "Lahore"]);
    expect(counts.get("Karachi")).toBe(2);
    const opts = dealCityOptions(counts);
    expect(opts.slice(0, 2)).toEqual([{ value: "Karachi", label: "Karachi (2)" }, { value: "Lahore", label: "Lahore (1)" }]);
    expect(opts).toContainEqual({ value: "Hyderabad", label: "Hyderabad" });
  });

  it("accepts only known cities as near", () => {
    expect(knownCity("hyderabad")).toBe("Hyderabad");
    expect(knownCity("Larkana")).toBe("Larkana");
    expect(knownCity("<script>")).toBe("");
  });
});
