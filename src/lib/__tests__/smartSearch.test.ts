import { describe, expect, it } from "vitest";
import { parseSmartSearch, smartLabels } from "@/lib/smartSearch";

const f = (s: string) => parseSmartSearch(s).filters;

describe("parseSmartSearch", () => {
  it("reads the full example sentence", () => {
    expect(f("Find Honda Civic under 70 lac in Karachi, automatic transmission.")).toEqual({
      make: "Honda", search: "Civic", maxPrice: 7_000_000, location: "Karachi", transmission: "Automatic",
    });
  });

  it("reads lakh, crore, k and million amounts", () => {
    expect(f("corolla under 45 lakh").maxPrice).toBe(4_500_000);
    expect(f("prado below 1.5 crore").maxPrice).toBe(15_000_000);
    expect(f("alto under 900k").maxPrice).toBe(900_000);
    expect(f("civic up to 7.5m").maxPrice).toBe(7_500_000);
    expect(f("cultus under rs 2,500,000").maxPrice).toBe(2_500_000);
    expect(f("civic 70lac").maxPrice).toBe(7_000_000);
    expect(f("civic 70 lac tak").maxPrice).toBe(7_000_000);
  });

  it("reads price ranges and minimums", () => {
    expect(f("cars between 50 lakh and 1 crore")).toMatchObject({ minPrice: 5_000_000, maxPrice: 10_000_000 });
    expect(f("corolla 30-40 lac")).toMatchObject({ minPrice: 3_000_000, maxPrice: 4_000_000 });
    expect(f("above 2 crore lahore")).toMatchObject({ minPrice: 20_000_000, location: "Lahore" });
    expect(f("around 30 lakh")).toMatchObject({ minPrice: 2_550_000, maxPrice: 3_450_000 });
  });

  it("reads years without mixing them up with prices", () => {
    expect(f("civic 2020")).toMatchObject({ make: "Honda", minYear: 2020, maxYear: 2020 });
    expect(f("corolla 2015 to 2020")).toMatchObject({ minYear: 2015, maxYear: 2020 });
    expect(f("vitz after 2016")).toMatchObject({ minYear: 2016 });
    expect(f("cars 2018+ under 60 lakh")).toMatchObject({ minYear: 2018, maxPrice: 6_000_000 });
    expect(f("mehran before 2012")).toMatchObject({ maxYear: 2012 });
    expect(f("civic 2020 and 70 lac")).toMatchObject({ minYear: 2020, maxYear: 2020, maxPrice: 7_000_000 });
  });

  it("reads mileage separately from price", () => {
    expect(f("city under 50k km under 40 lakh")).toMatchObject({ maxMileage: 50_000, maxPrice: 4_000_000 });
  });

  it("reads rentals and daily rates", () => {
    expect(f("prado on rent in islamabad")).toMatchObject({ type: "RENT", make: "Toyota", search: "Prado", location: "Islamabad" });
    expect(f("car under 8000 per day lahore")).toMatchObject({ type: "RENT", maxPrice: 8000, location: "Lahore" });
    expect(f("gari kiraye pe chahiye karachi").type).toBe("RENT");
  });

  it("reads fuel, transmission, condition, city short names and make aliases", () => {
    expect(f("hybrid manual new khi")).toMatchObject({ fuelType: "Hybrid", transmission: "Manual", condition: "NEW", location: "Karachi" });
    expect(f("benz in pindi")).toMatchObject({ make: "Mercedes", location: "Rawalpindi" });
    expect(f("Honda City 2019")).toMatchObject({ make: "Honda", search: "City", minYear: 2019 });
  });

  it("doesn't read 'city' as the Honda City by itself", () => {
    expect(f("toyota in lahore city")).toEqual({ make: "Toyota", location: "Lahore" });
  });

  it("leaves plain searches alone", () => {
    expect(parseSmartSearch("white")).toEqual({ filters: { search: "white" }, applied: false });
    expect(parseSmartSearch("").applied).toBe(false);
    expect(parseSmartSearch("climax 5").applied).toBe(false);
  });
});

describe("smartLabels", () => {
  it("lists what was understood", () => {
    expect(smartLabels(f("Find Honda Civic under 70 lac in Karachi, automatic"))).toEqual([
      "Honda", "Civic", "Up to PKR 70 lakh", "Karachi", "Automatic",
    ]);
    expect(smartLabels(f("corolla 2015 to 2020 30-40 lac"))).toEqual(["Toyota", "Corolla", "PKR 30 lakh – 40 lakh", "2015–2020"]);
    expect(smartLabels(f("car under 8000 per day"))).toEqual(["For rent", "Up to PKR 8,000/day"]);
  });
});
