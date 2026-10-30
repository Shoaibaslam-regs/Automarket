import { NextRequest, NextResponse } from "next/server";
import { takenDays } from "@/lib/takenDays";
import { reportError } from "@/lib/errorLog";

/** The days this rent deal is taken ("YYYY-MM-DD"): confirmed and handed-over bookings only. Public; only dates are sent. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const taken = await takenDays({ dealId: id });
    return NextResponse.json({ taken }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" } });
  } catch (error) {
    reportError("Deal availability error:", error);
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}
