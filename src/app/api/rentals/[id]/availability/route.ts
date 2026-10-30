import { NextRequest, NextResponse } from "next/server";
import { takenDays } from "@/lib/takenDays";
import { reportError } from "@/lib/errorLog";

/**
 * The days this rental is taken ("YYYY-MM-DD"), for the availability calendar: confirmed and handed-over
 * bookings only, since a request doesn't block anyone. Public; only dates are sent.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const taken = await takenDays({ rentalId: id });
    return NextResponse.json({ taken }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" } });
  } catch (error) {
    reportError("Rental availability error:", error);
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}
