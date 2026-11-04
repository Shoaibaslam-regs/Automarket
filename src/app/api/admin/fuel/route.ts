import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminAuth";
import { getFuelAdminData } from "@/lib/publicFuel";
import { clearFuelReviewHistory, enterFuelPrices } from "@/lib/fuelAdmin";
import { rateLimitResponse } from "@/lib/rateLimit";
import { reportError } from "@/lib/errorLog";

/** Admin → Fuel prices: current prices, waiting releases, history, market quotes and the jobs' status. */
export async function GET() {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  try {
    return NextResponse.json(await getFuelAdminData());
  } catch (error) {
    reportError("Admin fuel GET error:", error);
    return NextResponse.json({ error: "Failed to load fuel prices" }, { status: 500 });
  }
}

/** Prices entered by hand: { petrol, diesel, effectiveDate, sourceUrl, note? } (src/lib/fuelPrices.ts parseAdminPrices). */
export async function POST(req: NextRequest) {
  const gate = await requireAdminApi("announcements");
  if (!gate.ok) return gate.response;
  const limited = await rateLimitResponse("fuelCheck", String(gate.admin._id), "price changes");
  if (limited) return limited;
  try {
    const body = (await req.json().catch(() => ({}))) ?? {};
    const r = await enterFuelPrices(gate.admin, body);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ update: r.update }, { status: 201 });
  } catch (error) {
    reportError("Admin fuel POST error:", error);
    return NextResponse.json({ error: "Failed to save the prices" }, { status: 500 });
  }
}

/** Clears the "Recently reviewed" history (hidden, not deleted; see clearFuelReviewHistory). */
export async function DELETE() {
  const gate = await requireAdminApi("announcements");
  if (!gate.ok) return gate.response;
  try {
    return NextResponse.json({ cleared: await clearFuelReviewHistory(gate.admin) });
  } catch (error) {
    reportError("Admin fuel history clear error:", error);
    return NextResponse.json({ error: "Failed to clear the history" }, { status: 500 });
  }
}
