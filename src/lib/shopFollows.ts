// Client-safe rules for following shops (server side in src/lib/shopFollowServer.ts): the wording of the
// notifications and the limits. Unit-tested in src/lib/__tests__/shopFollows.test.ts.

/** Shop updates older than this aren't listed, even if never seen (the Notifications page stays short) */
export const SHOP_UPDATE_DAYS = 14;
/** At most this many shop updates on the Notifications page */
export const SHOP_UPDATES_SHOWN = 10;
/** A shop's notifications go to at most this many followers per post, newest followers last */
export const SHOP_NOTIFY_MAX = 5000;
/** Shops a person can follow */
export const MAX_FOLLOWED_SHOPS = 200;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * The morning summary of new vehicles from the shops someone follows: one shop by name ("Nadia Motors added 4
 * vehicles"), several in one line ("3 shops you follow added 9 vehicles") with the busiest named in the body.
 */
export function vehicleDigestText(shops: { name: string; count: number }[]): { title: string; body: string } | null {
  const list = shops.filter(s => s.count > 0).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  if (!list.length) return null;
  const total = list.reduce((sum, s) => sum + s.count, 0);
  if (list.length === 1) return { title: `${list[0].name} added ${plural(total, "vehicle")}`, body: "Tap to see them on the shop page." };
  const named = list.slice(0, 2).map(s => `${s.name} (${s.count})`);
  const rest = list.length - named.length;
  return {
    title: `${plural(list.length, "shop")} you follow added ${plural(total, "vehicle")}`,
    body: rest > 0 ? `${named.join(", ")} and ${plural(rest, "more shop")}.` : `${named.join(" and ")}.`,
  };
}

/** "Nadia Motors posted a deal: Wedding convoy package" and the like, for pushes and the Notifications page. */
export function shopPostText(kind: "deal" | "notice", shopName: string, title: string): string {
  return kind === "deal" ? `${shopName} posted a deal: ${title}` : `${shopName}: ${title}`;
}
