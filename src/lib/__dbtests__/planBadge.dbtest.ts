import { describe, expect, it } from "vitest";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { syncPlanBadge } from "@/lib/planBadgeSync";
import { DAY, makeBusiness, makeUser } from "./factories";

type V = { verification?: { source?: string; expiresAt?: Date; paidUntil?: Date } };
const badge = async (id: unknown) => (await Organization.findById(id).lean<V>())?.verification;

// The Verified badge that comes with Ultimate (src/lib/planBadgeSync.ts)
describe("plan badge", () => {
  it("gives Ultimate the badge until the plan ends, follows a renewal and ends it on a lower plan", async () => {
    const owner = await makeUser("UNLIMITED", 30);
    const org = await makeBusiness(owner);
    await syncPlanBadge(owner._id);
    expect((await badge(org._id))?.source).toBe("PLAN");
    expect(Math.abs((await badge(org._id))!.expiresAt!.getTime() - (Date.now() + 30 * DAY))).toBeLessThan(60_000);

    await User.updateOne({ _id: owner._id }, { planExpiresAt: new Date(Date.now() + 60 * DAY) });
    await syncPlanBadge(owner._id);
    expect(Math.abs((await badge(org._id))!.expiresAt!.getTime() - (Date.now() + 60 * DAY))).toBeLessThan(60_000);

    await User.updateOne({ _id: owner._id }, { plan: "PRO" });
    await syncPlanBadge(owner._id);
    expect((await badge(org._id))!.expiresAt!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("leaves a longer paid badge alone, and brings a shorter one back when the plan stops", async () => {
    const owner = await makeUser("UNLIMITED", 30);
    const org = await makeBusiness(owner);
    await Organization.updateOne({ _id: org._id }, { verification: { verifiedAt: new Date(), expiresAt: new Date(Date.now() + 90 * DAY), source: "PAID" } });
    expect(await syncPlanBadge(owner._id)).toBe(false);

    await Organization.updateOne({ _id: org._id }, { verification: { verifiedAt: new Date(), expiresAt: new Date(Date.now() + 10 * DAY), source: "PAID" } });
    await syncPlanBadge(owner._id);
    expect(await badge(org._id)).toMatchObject({ source: "PLAN" });
    await User.updateOne({ _id: owner._id }, { plan: "FREE" });
    await syncPlanBadge(owner._id);
    const back = await badge(org._id);
    expect(back?.source).toBe("PAID");
    expect(Math.abs(back!.expiresAt!.getTime() - (Date.now() + 10 * DAY))).toBeLessThan(60_000);
  });
});
