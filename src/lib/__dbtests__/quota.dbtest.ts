import { describe, expect, it } from "vitest";
import { ListingLog } from "@/models/ListingLog";
import { QuotaCounter } from "@/models/QuotaCounter";
import { User } from "@/models/User";
import { Listing } from "@/models/Listing";
import { getSubscription, getUsage, reserveListingSlot } from "@/lib/subscription";
import { quotaKey } from "@/lib/quotaCounter";
import { makeBusiness, makeListing, makeUser, newId } from "./factories";

// The monthly listing and deal quota (reserveListingSlot, src/lib/quotaCounter.ts): requests sent at the same moment
// must never pass the limit, and must not all be refused either.
describe("listing quota", () => {
  it("lets exactly the slots left through when a team posts at once, counts old posts, and gives slots back", async () => {
    const owner = await makeUser("STARTER", 20); // Premium: 10 a month
    const manager = await makeUser();
    const org = await makeBusiness(owner, [{ user: manager, role: "MANAGER" }]);
    // 3 posts from before the quota log existed
    for (let i = 0; i < 3; i++) await makeListing(owner._id);
    const sub = await getSubscription(String(owner._id));
    expect((await getUsage(String(owner._id), sub)).listings).toBe(3);

    const results = await Promise.all(Array.from({ length: 25 }, (_, i) => reserveListingSlot(String(i % 2 ? manager._id : owner._id), { listingId: newId() })));
    expect(results.filter(r => r.ok)).toHaveLength(7);
    expect(await ListingLog.countDocuments()).toBe(7);
    expect((await getUsage(String(owner._id), sub)).listings).toBe(10);
    const refused = results.find(r => !r.ok) as { ok: false; error: { code: string; used: number; limit: number } };
    expect(refused.error).toMatchObject({ code: "PLAN_LIMIT_REACHED", used: 10, limit: 10 });

    // A failed save gives its slot back, and only that one slot opens
    const passed = results.filter(r => r.ok) as Array<{ ok: true; release: () => Promise<void> }>;
    await passed[0].release();
    expect((await getUsage(String(owner._id), sub)).listings).toBe(9);
    expect((await Promise.all([1, 2, 3].map(() => reserveListingSlot(String(owner._id), { listingId: newId() })))).filter(r => r.ok)).toHaveLength(1);

    // Deleting posts doesn't give quota back; the meter matches the refusal
    await Listing.deleteMany({});
    expect((await getUsage(String(owner._id), sub)).listings).toBe(10);
    expect((await reserveListingSlot(String(owner._id), { listingId: newId() })).ok).toBe(false);

    // Upgrading mid-month carries on from the same count
    await User.updateOne({ _id: owner._id }, { plan: "PRO" }); // Premium Plus: 35
    const up = await Promise.all(Array.from({ length: 40 }, () => reserveListingSlot(String(manager._id), { listingId: newId() })));
    expect(up.filter(r => r.ok)).toHaveLength(25);
    const counter = await QuotaCounter.findOne({ key: quotaKey("listings", `org:${org._id}`) }).lean();
    expect(counter?.count).toBe(35);
  });

  it("gives a private seller their own count", async () => {
    const seller = await makeUser();
    const limit = (await getSubscription(String(seller._id))).plan.limits.listings!;
    const results = await Promise.all(Array.from({ length: limit + 5 }, () => reserveListingSlot(String(seller._id), { listingId: newId() })));
    expect(results.filter(r => r.ok)).toHaveLength(limit);
  });

  it("names the month from Pakistan time", () => {
    expect(quotaKey("listings", "user:x", new Date("2026-10-31T19:30:00Z"))).toBe("listings:user:x:2026-11");
    expect(quotaKey("listings", "user:x", new Date("2026-10-31T18:30:00Z"))).toBe("listings:user:x:2026-10");
  });
});
