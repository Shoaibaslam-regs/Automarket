import { describe, expect, it } from "vitest";
import { ShopFollow } from "@/models/ShopFollow";
import { ShopNotice } from "@/models/ShopNotice";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { followedShops, followerCounts, markShopUpdatesSeen, sendShopVehicleDigest, shopUpdatesFor } from "@/lib/shopFollowServer";
import { DAY, makeBusiness, makeDeal, makeListing, makeUser } from "./factories";

const notice = (organizationId: unknown, createdBy: unknown, title: string) =>
  ShopNotice.create({ organizationId, createdBy, kind: "NEWS", title, endsAt: new Date(Date.now() + 7 * DAY) });

// Following shops (src/lib/shopFollowServer.ts): the updates a follower sees, muting, "since you last looked",
// the follower counts and the morning vehicles summary.
describe("shop follows", () => {
  it("lists a followed shop's new deal, announcement and vehicles, newest first, until they are seen", async () => {
    const owner = await makeUser("STARTER", 20);
    const org = await makeBusiness(owner);
    const fan = await makeUser();
    await ShopFollow.create({ userId: fan._id, organizationId: org._id });

    await makeDeal(org._id, owner._id);
    await notice(org._id, owner._id, "Eid offer");
    await makeListing(owner._id);
    await makeListing(owner._id);

    const items = await shopUpdatesFor(String(fan._id));
    expect(items.map(i => i.id.split("-")[0]).sort()).toEqual(["deal", "notice", "vehicles"]);
    expect(items.find(i => i.id.startsWith("vehicles"))?.title).toBe(`${org.name} added 2 vehicles`);
    expect(items.find(i => i.id.startsWith("notice"))).toMatchObject({ title: `${org.name}: Eid offer`, href: `/dealers/${org.slug}` });
    expect(items.find(i => i.id.startsWith("deal"))?.href).toMatch(/^\/deals\//);

    // Opening Notifications marks them seen; the next post is new again
    await markShopUpdatesSeen(String(fan._id), new Date(Date.now() + 1000));
    expect(await shopUpdatesFor(String(fan._id), new Date(Date.now() + 2000))).toHaveLength(0);
    await new Promise(r => setTimeout(r, 1100));
    await notice(org._id, owner._id, "New stock arriving");
    expect((await shopUpdatesFor(String(fan._id), new Date(Date.now() + 1000))).map(i => i.title)).toEqual([`${org.name}: New stock arriving`]);
  });

  it("shows nothing from muted shops, posts from before the follow, or suspended shops", async () => {
    const owner = await makeUser("STARTER", 20);
    const org = await makeBusiness(owner);
    await notice(org._id, owner._id, "Old news");
    const fan = await makeUser();
    await new Promise(r => setTimeout(r, 20));
    await ShopFollow.create({ userId: fan._id, organizationId: org._id });
    expect(await shopUpdatesFor(String(fan._id))).toHaveLength(0);

    await notice(org._id, owner._id, "Fresh news");
    expect(await shopUpdatesFor(String(fan._id))).toHaveLength(1);
    await ShopFollow.updateOne({ userId: fan._id }, { muted: true });
    expect(await shopUpdatesFor(String(fan._id))).toHaveLength(0);
    await ShopFollow.updateOne({ userId: fan._id }, { muted: false });
    await Organization.updateOne({ _id: org._id }, { isActive: false });
    expect(await shopUpdatesFor(String(fan._id))).toHaveLength(0);
  });

  it("counts followers and lists followed shops with their live counts", async () => {
    const owner = await makeUser("STARTER", 20);
    const org = await makeBusiness(owner);
    await makeListing(owner._id);
    await makeListing(owner._id, { type: "RENT" });
    await makeDeal(org._id, owner._id);
    const fans = await Promise.all([1, 2, 3].map(() => makeUser()));
    for (const f of fans) await ShopFollow.create({ userId: f._id, organizationId: org._id });
    expect(await followerCounts(org._id)).toEqual({ total: 3, thisMonth: 3 });
    const [shop] = await followedShops(String(fans[0]._id));
    expect(shop).toMatchObject({ slug: org.slug, forSale: 1, forRent: 1, deals: 1, muted: false });
  });

  it("sends the morning summary to unmuted followers, never to the shop's own team", async () => {
    await Listing.deleteMany({});
    const owner = await makeUser("STARTER", 20);
    const org = await makeBusiness(owner);
    await makeListing(owner._id);
    const fan = await makeUser();
    const muted = await makeUser();
    await ShopFollow.create([{ userId: fan._id, organizationId: org._id }, { userId: muted._id, organizationId: org._id, muted: true }, { userId: owner._id, organizationId: org._id }]);
    expect(await sendShopVehicleDigest()).toBe(1);
    expect(await User.countDocuments({ _id: fan._id })).toBe(1);
  });
});
