import { describe, expect, it } from "vitest";
import { shopPostText, vehicleDigestText } from "@/lib/shopFollows";

describe("vehicleDigestText", () => {
  it("names a single shop", () => {
    expect(vehicleDigestText([{ name: "Nadia Motors", count: 4 }])).toEqual({ title: "Nadia Motors added 4 vehicles", body: "Tap to see them on the shop page." });
    expect(vehicleDigestText([{ name: "Nadia Motors", count: 1 }])?.title).toBe("Nadia Motors added 1 vehicle");
  });
  it("combines several shops, busiest first, and skips empty ones", () => {
    expect(vehicleDigestText([{ name: "A Motors", count: 2 }, { name: "B Cars", count: 5 }, { name: "C Rentals", count: 0 }]))
      .toEqual({ title: "2 shops you follow added 7 vehicles", body: "B Cars (5) and A Motors (2)." });
    expect(vehicleDigestText([{ name: "A", count: 1 }, { name: "B", count: 3 }, { name: "C", count: 2 }, { name: "D", count: 1 }])?.body)
      .toBe("B (3), C (2) and 2 more shops.");
  });
  it("gives nothing when no vehicles were added", () => {
    expect(vehicleDigestText([])).toBeNull();
    expect(vehicleDigestText([{ name: "A", count: 0 }])).toBeNull();
  });
});

describe("shopPostText", () => {
  it("words deals and announcements", () => {
    expect(shopPostText("deal", "Nadia Motors", "Wedding convoy package")).toBe("Nadia Motors posted a deal: Wedding convoy package");
    expect(shopPostText("notice", "Nadia Motors", "Eid offer")).toBe("Nadia Motors: Eid offer");
  });
});
