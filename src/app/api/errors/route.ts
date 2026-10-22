import { NextRequest, NextResponse } from "next/server";
import { recordError } from "@/lib/errorLog";
import { clientIp, hitRateLimit } from "@/lib/rateLimit";

const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);

/**
 * Browser crashes caught by the error screens (reportClientError in src/lib/clientErrors.ts).
 * Open to signed-out visitors, so it is limited per IP and always answers 204.
 */
export async function POST(req: NextRequest) {
  const limit = await hitRateLimit("clientErrors", clientIp(req));
  if (!limit.ok) return new NextResponse(null, { status: 204 });
  const body = await req.json().catch(() => null);
  const message = text(body?.message, 1000);
  if (message) {
    await recordError({
      source: "CLIENT",
      where: text(body?.where, 100) || "Browser",
      message,
      stack: text(body?.stack, 4000),
      path: text(body?.path, 300),
    });
  }
  return new NextResponse(null, { status: 204 });
}
