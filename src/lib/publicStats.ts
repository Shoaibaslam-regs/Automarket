import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { Deal } from "@/models/Deal";
import { PUBLIC_CACHE_SECONDS } from "@/lib/pageCache";
import { liveQuery } from "@/lib/publicDeals";

/** The marketplace's live numbers shown on the home page. */
export type PublicStats = {
  listings: number; forSale: number; forRent: number;
  businesses: number; users: number; deals: number; cities: number;
  at: string;
};

export const EMPTY_STATS: PublicStats = { listings: 0, forSale: 0, forRent: 0, businesses: 0, users: 0, deals: 0, cities: 0, at: new Date(0).toISOString() };

/**
 * Counts for the home page's live strip, read at most once a minute (shared by the page and /api/stats).
 * Falls back to zeros if the database can't be reached, so the home page still renders.
 */
export const getPublicStats = unstable_cache(
  async (): Promise<PublicStats> => {
    try {
      await connectDB();
      const active = { status: "ACTIVE" };
      const [listings, forSale, forRent, businesses, users, deals, cities] = await Promise.all([
        Listing.countDocuments(active),
        Listing.countDocuments({ ...active, type: { $in: ["SALE", "BOTH"] } }),
        Listing.countDocuments({ ...active, type: { $in: ["RENT", "BOTH"] } }),
        Organization.countDocuments({ isActive: { $ne: false } }),
        User.countDocuments(),
        Deal.countDocuments(liveQuery(new Date())),
        Listing.distinct("location", active).then(c => new Set(c.map(x => String(x).trim().toLowerCase()).filter(Boolean)).size),
      ]);
      return { listings, forSale, forRent, businesses, users, deals, cities, at: new Date().toISOString() };
    } catch (err) {
      console.error("Public stats failed:", err);
      return EMPTY_STATS;
    }
  },
  ["public-stats"],
  { revalidate: PUBLIC_CACHE_SECONDS }
);
