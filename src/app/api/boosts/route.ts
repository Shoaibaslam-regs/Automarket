import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { boostStatus, startBoost } from "@/lib/boostServer";
import { rateLimitResponse } from "@/lib/rateLimit";
import { reportError } from "@/lib/errorLog";

export const dynamic = "force-dynamic";

/** This month's boosts for the signed-in person's business or account (src/lib/boostServer.ts). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectDB();
    return NextResponse.json(await boostStatus(session.user.id));
  } catch (error) {
    reportError("Boost status error:", error);
    return NextResponse.json({ error: "Failed to load boosts" }, { status: 500 });
  }
}

/** Boosts a vehicle `{ listingId }` or a deal `{ dealId }`. Refused below Premium Plus, when used up, or already boosted. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await rateLimitResponse("boosts", session.user.id, "boosts");
  if (limited) return limited;
  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));
    const r = await startBoost(session.user.id, {
      listingId: typeof body?.listingId === "string" ? body.listingId : undefined,
      dealId: typeof body?.dealId === "string" && typeof body?.listingId !== "string" ? body.dealId : undefined,
    });
    if (!r.ok) return NextResponse.json({ error: r.error, code: r.code }, { status: r.status });
    return NextResponse.json({ boostedUntil: r.until, left: r.left }, { status: 201 });
  } catch (error) {
    reportError("Boost error:", error);
    return NextResponse.json({ error: "Couldn't boost it right now" }, { status: 500 });
  }
}
