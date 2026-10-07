import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private, per-user and admin areas have nothing for search engines
      disallow: ["/api/", "/admin", "/dashboard", "/bookings", "/messages", "/profile", "/sell", "/saved", "/compare", "/business", "/rentals/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
