import { NextRequest, NextResponse } from "next/server";
import { getSponsored } from "@/lib/sponsored";
import { PUBLIC_CACHE_SECONDS } from "@/lib/pageCache";
import { reportError } from "@/lib/errorLog";

export const dynamic = "force-dynamic";

/**
 * Sponsored cards for one visitor: `?city` (their Browse city), `make` and `type` (Browse filters), `limit`.
 * The same for everyone with the same query, so the CDN keeps it for PUBLIC_CACHE_SECONDS; the rotation therefore
 * changes about once a minute per city.
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const type = sp.get("type");
    const items = await getSponsored({
      city: (sp.get("city") || "").slice(0, 80),
      make: (sp.get("make") || "").slice(0, 60),
      type: type === "SALE" || type === "RENT" ? type : "",
      limit: Number(sp.get("limit")) || undefined,
    });
    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": `public, max-age=0, s-maxage=${PUBLIC_CACHE_SECONDS}, stale-while-revalidate=${PUBLIC_CACHE_SECONDS}` } }
    );
  } catch (error) {
    reportError("Sponsored GET error:", error);
    return NextResponse.json({ items: [] });
  }
}
