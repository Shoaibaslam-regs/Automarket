import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdminApi } from "@/lib/adminAuth";
import { rateLimitResponse } from "@/lib/rateLimit";
import { reportError } from "@/lib/errorLog";
import { SYSTEM_USAGE_TAG, getSystemUsage, readSystemUsage } from "@/lib/systemUsage";
import { usageAlerts } from "@/lib/usageMeter";

export const dynamic = "force-dynamic";

/**
 * Database and UploadThing storage against their limits (src/lib/systemUsage.ts), saved for 10 minutes.
 * `?count=1` returns only `{ alerts }`, the services at or past 80%, for the sidebar badge.
 * `?refresh=1` reads both now (rate limit `usageRefresh`) and replaces the saved copy.
 * Read-only, so every admin (managers too) can see it; no keys or connection details are ever sent.
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  try {
    const sp = req.nextUrl.searchParams;
    if (sp.get("count") === "1") {
      return NextResponse.json({ alerts: usageAlerts(await getSystemUsage()) });
    }
    if (sp.get("refresh") === "1") {
      const limited = await rateLimitResponse("usageRefresh", String(gate.admin._id), "refreshes");
      if (limited) return limited;
      const usage = await readSystemUsage();
      // The next normal load reads again too, so the badge and other admins catch up
      revalidateTag(SYSTEM_USAGE_TAG, { expire: 0 });
      return NextResponse.json(usage);
    }
    return NextResponse.json(await getSystemUsage());
  } catch (error) {
    reportError("Admin usage GET error:", error);
    return NextResponse.json({ error: "Failed to load usage" }, { status: 500 });
  }
}
