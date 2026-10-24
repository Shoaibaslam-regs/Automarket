import { NextRequest, NextResponse } from "next/server";
import { getLiveDealsPage, parseDealParams } from "@/lib/publicDeals";
import { PUBLIC_CACHE_SECONDS } from "@/lib/pageCache";
import { reportError } from "@/lib/errorLog";

export const dynamic = "force-dynamic";

/**
 * The next pages of the Deals page (`?make&city&type&sort&page`), for loading more as the visitor scrolls.
 * Public and the same for everyone, so the CDN may keep it as long as the page cache does.
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Math.min(100, parseInt(sp.get("page") || "1") || 1));
    const { deals, total } = await getLiveDealsPage(parseDealParams(k => sp.get(k)), page);
    return NextResponse.json(
      { deals, total, page },
      { headers: { "Cache-Control": `public, max-age=0, s-maxage=${PUBLIC_CACHE_SECONDS}, stale-while-revalidate=${PUBLIC_CACHE_SECONDS}` } }
    );
  } catch (error) {
    reportError("Deals page error:", error);
    return NextResponse.json({ error: "Couldn't load more deals" }, { status: 500 });
  }
}
