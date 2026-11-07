import { beforeEach, describe, expect, it } from "vitest";
import { Ad } from "@/models/Ad";
import { topPlaceProblem, ownTopUntil } from "@/lib/sponsored";
import { DAY, newId } from "./factories";

// Top ads (src/lib/sponsored.ts topPlaceProblem): only for a business with a city, one Top place per business
// in its city at a time, and at most two businesses' Top ads in a city at once.
const now = Date.now();
const top = (organizationId = newId(), city = "Karachi", fromDays = -1, toDays = 6) => Ad.create({
  organizationId, requestedBy: newId(), kind: "SHOP", targetLabel: "Shop", weeks: 1, price: 2499, paymentRef: "TID 1",
  tier: "TOP", city, status: "APPROVED", startsAt: new Date(now + fromDays * DAY), endsAt: new Date(now + toDays * DAY),
});
const ask = (organizationId = newId(), city: string | null = "Karachi") =>
  topPlaceProblem({ organizationId, city, start: new Date(now), weeks: 1 });

beforeEach(async () => { await Ad.deleteMany({}); });

describe("Top places", () => {
  it("need the business's city", async () => {
    expect(await ask(newId(), null)).toEqual({ code: "NO_CITY" });
    expect(await ask(newId(), "  ")).toEqual({ code: "NO_CITY" });
  });

  it("allow one per business at a time, from the day its own ends", async () => {
    const shop = newId();
    const own = await top(shop);
    expect(await ask(shop)).toMatchObject({ code: "OWN_TOP", until: own.endsAt });
    expect((await ownTopUntil(shop, "karachi "))?.getTime()).toBe(own.endsAt!.getTime());
    // After it ends, or in another city, it's free
    expect(await topPlaceProblem({ organizationId: shop, city: "Karachi", start: own.endsAt!, weeks: 1 })).toBeNull();
    expect(await ask(shop, "Lahore")).toBeNull();
  });

  it("allow two businesses per city, naming the first day one frees up", async () => {
    const first = await top(newId(), "Karachi", -1, 3);
    await top(newId(), "Karachi", -1, 5);
    expect(await ask(newId(), "Karachi")).toEqual({ code: "CITY_FULL", until: first.endsAt });
    expect(await ask(newId(), "Lahore")).toBeNull();
  });
});
