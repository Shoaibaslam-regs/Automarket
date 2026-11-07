import { describe, expect, it } from "vitest";
import { adPreviewTips, type AdPreviewFacts } from "@/lib/ads";

const ready: AdPreviewFacts = { kind: "SHOP", verified: true, hasLogo: true, hasDescription: true, hasCity: true, photos: 0, title: "Nadia Motors" };
const links = (f: AdPreviewFacts, id?: string) => adPreviewTips(f, id).map(t => t.link ?? t.text);

describe("adPreviewTips", () => {
  it("has nothing to say about a complete shop card", () => {
    expect(adPreviewTips(ready)).toEqual([]);
  });

  it("asks a shop for its logo, description and city", () => {
    expect(links({ ...ready, hasLogo: false, hasDescription: false, hasCity: false })).toEqual(["Add a logo", "Write a short description", "Add your city"]);
  });

  it("points a vehicle or deal without photos to its own edit page", () => {
    const [tip] = adPreviewTips({ ...ready, kind: "LISTING", photos: 0, title: "Civic" }, "abc");
    expect(tip).toMatchObject({ link: "Add photos", href: "/sell/edit/abc" });
    expect(adPreviewTips({ ...ready, kind: "DEAL", photos: 0, title: "Eid deal" }, "d1")[0].href).toBe("/business/deals/d1/edit");
    expect(links({ ...ready, kind: "LISTING", photos: 4, title: "Civic" }, "abc")).toEqual(["Edit photos"]);
    expect(adPreviewTips({ ...ready, kind: "DEAL", photos: 3, title: "Eid deal" }, "d1")).toEqual([]);
  });

  it("shows how a long title is cut, and suggests the Verified badge", () => {
    const tips = adPreviewTips({ ...ready, verified: false, kind: "LISTING", photos: 1, title: "Toyota Corolla Altis Grande 1.8 CVT-i 2022" });
    expect(tips[0].text).toContain('"Toyota Corolla Altis Grande…"');
    expect(tips[1].link).toBe("About the Verified badge");
  });
});
