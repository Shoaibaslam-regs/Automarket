import { NextRequest, NextResponse } from "next/server";
import { runDailyJobs } from "@/lib/dailyJobs";
import { hitRateLimit } from "@/lib/rateLimit";
import { pkDay } from "@/lib/money";
import { reportError } from "@/lib/errorLog";
import { cronRefusal } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";

/**
 * The daily job (vercel.json `crons`, 03:00 UTC = 08:00 in Pakistan): plan-ending reminders and the morning
 * "due today" notifications and the fuel price check (src/lib/dailyJobs.ts). Vercel calls it with `Authorization: Bearer <CRON_SECRET>`;
 * without CRON_SECRET set it refuses every call. It runs once per Pakistan day even if called again.
 */
export async function GET(req: NextRequest) {
  const refused = cronRefusal(req);
  if (refused) return refused;

  const day = pkDay();
  const once = await hitRateLimit("cronDaily", day);
  if (!once.ok) return NextResponse.json({ skipped: `Already ran for ${day}` });
  try {
    const result = await runDailyJobs();
    return NextResponse.json({ day, ...result });
  } catch (error) {
    reportError("Daily cron failed:", error);
    return NextResponse.json({ error: "Daily jobs failed" }, { status: 500 });
  }
}
