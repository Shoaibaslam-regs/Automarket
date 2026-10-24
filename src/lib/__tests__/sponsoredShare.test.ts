import { describe, expect, it } from "vitest";
import { SPONSORED_AD, adPrice, standardShare } from "@/lib/plans";

describe("standardShare", () => {
  it("shows a Standard ad on every visit while there are free places", () => {
    expect(standardShare(1, 0)).toBe(1);
    expect(standardShare(SPONSORED_AD.slotsShown, 0)).toBe(1);
  });
  it("shares the places when more ads run than fit", () => {
    expect(standardShare(16, 0)).toBe(2);
    expect(standardShare(100, 0)).toBe(13);
  });
  it("leaves fewer places for Standard ads when Top ads run", () => {
    // 2 Top ads take 2 of the 8 places, so 12 Standard ads share 6
    expect(standardShare(12, 2)).toBe(2);
    // never more Top ads than a city allows
    expect(standardShare(12, 5)).toBe(standardShare(12, SPONSORED_AD.topPerCity));
  });
});

describe("adPrice", () => {
  it("prices by tier and weeks", () => {
    expect(adPrice(2)).toBe(2 * SPONSORED_AD.pricePerWeek.STANDARD);
    expect(adPrice(4, "TOP")).toBe(4 * SPONSORED_AD.pricePerWeek.TOP);
  });
});
