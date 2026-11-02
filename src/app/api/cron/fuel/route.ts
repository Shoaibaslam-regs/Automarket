import { NextRequest, NextResponse } from "next/server";
import { runFuelJobs } from "@/lib/fuelJobs";
import { cronRefusal } from "@/lib/cronAuth";
import { reportError } from "@/lib/errorLog";

export const dynamic = "force-dynamic";

/**
 * The Fuel Price Tracker on its own (src/lib/fuelJobs.ts), for a scheduler that calls more often than Vercel's
 * daily cron: Vercel's Hobby plan allows one cron a day, so point an outside scheduler (cron-job.org, GitHub Actions)
 * here every 6 hours with `Authorization: Bearer <CRON_SECRET>`. Runs can't overlap (a 5-minute lock).
 */
export async function GET(req: NextRequest) {
  const refused = cronRefusal(req);
  if (refused) return refused;
  try {
    return NextResponse.json(await runFuelJobs());
  } catch (error) {
    reportError("Fuel cron failed:", error);
    return NextResponse.json({ error: "Fuel jobs failed" }, { status: 500 });
  }
}
