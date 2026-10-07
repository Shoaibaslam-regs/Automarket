import type { MetadataRoute } from "next";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { SITE_URL } from "@/lib/site";

// Regenerate at most once an hour so new listings show up without a rebuild
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/home`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/listings`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/listings?type=RENT`, changeFrequency: "daily", priority: 0.7 },
  ];

  try {
    await connectDB();
    const listings = await Listing.find({ status: "ACTIVE" })
      .sort({ updatedAt: -1 })
      .limit(45000) // A single sitemap file is capped at 50,000 URLs
      .select("_id updatedAt images")
      .lean<{ _id: unknown; updatedAt: Date; images?: string[] }[]>();

    return [
      ...staticPages,
      ...listings.map(l => ({
        url: `${SITE_URL}/listings/${String(l._id)}`,
        lastModified: l.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
        images: l.images?.slice(0, 1),
      })),
    ];
  } catch (err) {
    // Still serve the static pages if the database is unreachable (e.g. during a build)
    console.error("Sitemap listings failed:", err);
    return staticPages;
  }
}
