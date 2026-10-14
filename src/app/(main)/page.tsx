import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";
import Landing, { type LandingStats, type ShowcaseListing } from "@/components/landing/Landing";
import { getLiveDeals } from "@/lib/publicDeals";

// Real numbers and listings, refreshed at most once a minute
export const revalidate = 60;

async function getData(): Promise<{ listings: ShowcaseListing[]; stats: LandingStats }> {
  try {
    await connectDB();
    const active = { status: "ACTIVE" };

    const [docs, listings, users, cities, rentals] = await Promise.all([
      Listing.find({ ...active, "images.0": { $exists: true } })
        .sort({ featured: -1, createdAt: -1 })
        .limit(3)
        .select("title make model year price type location images")
        .lean(),
      Listing.countDocuments(active),
      User.countDocuments(),
      Listing.distinct("location", active),
      Listing.countDocuments({ ...active, type: { $in: ["RENT", "BOTH"] } }),
    ]);

    return {
      listings: docs.map(d => ({
        _id: String(d._id),
        title: d.title,
        make: d.make,
        model: d.model,
        year: d.year,
        price: d.price,
        type: d.type,
        location: d.location,
        image: d.images[0],
      })),
      stats: { listings, users, cities: cities.length, rentals },
    };
  } catch (err) {
    // The landing page should still render if the database is unreachable
    console.error("Landing data failed:", err);
    return { listings: [], stats: { listings: 0, users: 0, cities: 0, rentals: 0 } };
  }
}

export default async function LandingPage() {
  // Deals are read through their own 60-second cache, cleared whenever a deal changes
  const [{ listings, stats }, deals] = await Promise.all([
    getData(),
    getLiveDeals({ sort: "discount", limit: 3 }).catch(() => []),
  ]);
  return <Landing listings={listings} stats={stats} deals={deals} now={new Date().getTime()} />;
}
