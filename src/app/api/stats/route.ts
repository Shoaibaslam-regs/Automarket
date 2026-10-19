import { NextResponse } from "next/server";
import { getPublicStats } from "@/lib/publicStats";

/** The home page's live numbers (listings, businesses, users, deals, cities), refreshed at most once a minute. */
export async function GET() {
  const stats = await getPublicStats();
  return NextResponse.json(stats, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60" } });
}
