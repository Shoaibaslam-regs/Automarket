/** Public base URL of the site, used for absolute links in metadata, sitemap and emails. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3001").replace(/\/$/, "");

export const SITE_NAME = "AutoMarket";
