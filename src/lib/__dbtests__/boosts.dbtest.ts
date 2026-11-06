import { describe, expect, it } from "vitest";
import { BoostLog } from "@/models/BoostLog";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";
import { boostStatus, startBoost, syncBoosts } from "@/lib/boostServer";
import { DAY, makeBusiness, makeDeal, makeListing, makeUser } from "./factories";

const near = (d: Date | undefined, ms: number) => Math.abs((d?.getTime() ?? 0) - (Date.now() + ms)) < 60_000;

// Boosts (src/lib/boostServer.ts): the monthly allowance under simultaneous presses, who may boost, and how running
// boosts follow the plan.
describe("boosts", () => {
  it("gives exactly the allowance when many are pressed at once, one per vehicle, and only to owners and managers", async () => {
    const owner = await makeUser("PRO", 20); // Premium Plus: 12, 7 days each
    const sales = await makeUser();
    await makeBusiness(owner, [{ user: sales, role: "SALES" }]);
    const cars = await Promise.all(Array.from({ length: 20 }, () => makeListing(owner._id)));

    expect(await boostStatus(String(owner._id))).toMatchObject({ allowed: true, perMonth: 12, left: 12, canBoost: true });
    expect((await boostStatus(String(sales._id))).canBoost).toBe(false);
    expect((await startBoost(String(sales._id), { listingId: String(cars[0]._id) })).ok).toBe(false);

    const results = await Promise.all(cars.map(c => startBoost(String(owner._id), { listingId: String(c._id) })));
    expect(results.filter(r => r.ok)).toHaveLength(12);
    expect(await BoostLog.countDocuments()).toBe(12);
    const first = results.find(r => r.ok) as { ok: true; until: Date };
    expect(near(first.until, 7 * DAY)).toBe(true);

    // A used boost stays used even after the vehicle is deleted
    await Listing.deleteOne({ _id: cars[0]._id });
    expect((await boostStatus(String(owner._id))).left).toBe(0);
  });

  it("uses one boost when the same vehicle is pressed several times at once, and refuses sold vehicles", async () => {
    const owner = await makeUser("UNLIMITED", 60);
    await makeBusiness(owner);
    const car = await makeListing(owner._id);
    const sold = await makeListing(owner._id, { status: "SOLD" });
    const same = await Promise.all([1, 2, 3, 4, 5].map(() => startBoost(String(owner._id), { listingId: String(car._id) })));
    expect(same.filter(r => r.ok)).toHaveLength(1);
    expect(await BoostLog.countDocuments({ listingId: car._id })).toBe(1);
    expect((await startBoost(String(owner._id), { listingId: String(sold._id) })).ok).toBe(false);
  });

  it("boosts a live deal for Ultimate's 30 days, never another business's", async () => {
    const owner = await makeUser("UNLIMITED", 60);
    const org = await makeBusiness(owner);
    const other = await makeUser("UNLIMITED", 60);
    await makeBusiness(other);
    const deal = await makeDeal(org._id, owner._id);
    const r = await startBoost(String(owner._id), { dealId: String(deal._id) });
    expect(r.ok && near(r.until, 30 * DAY)).toBe(true);
    expect((await startBoost(String(other._id), { dealId: String(deal._id) })).ok).toBe(false);
  });

  it("caps boosts to a shorter plan, restores them on renewal, and stops them on a plan without boosts", async () => {
    const owner = await makeUser("PRO", 20);
    await makeBusiness(owner);
    const car = await makeListing(owner._id);
    await startBoost(String(owner._id), { listingId: String(car._id) });
    const until = async () => (await Listing.findById(car._id).lean<{ boostedUntil: Date }>())!.boostedUntil;

    await User.updateOne({ _id: owner._id }, { planExpiresAt: new Date(Date.now() + 3 * DAY) });
    await syncBoosts(owner._id);
    expect(near(await until(), 3 * DAY)).toBe(true);
    await User.updateOne({ _id: owner._id }, { planExpiresAt: new Date(Date.now() + 33 * DAY) });
    await syncBoosts(owner._id);
    expect(near(await until(), 7 * DAY)).toBe(true);
    await User.updateOne({ _id: owner._id }, { plan: "STARTER" });
    await syncBoosts(owner._id);
    expect((await until()).getTime()).toBeLessThanOrEqual(Date.now());
    expect((await boostStatus(String(owner._id))).allowed).toBe(false);
  });
});
