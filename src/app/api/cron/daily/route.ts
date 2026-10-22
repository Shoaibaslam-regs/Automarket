import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { runDailyJobs } from "@/lib/dailyJobs";
import { hitRateLimit } from "@/lib/rateLimit";
import { pkDay } from "@/lib/money";
import { reportError } from "@/lib/errorLog";

export const dynamic = "force-dynamic";

const digest = (s: string) => createHash("sha256").update(s).digest();

/**
 * The daily job (vercel.json `crons`, 03:00 UTC = 08:00 in Pakistan): plan-ending reminders and the morning
 * "due today" notifications (src/lib/dailyJobs.ts). Vercel calls it with `Authorization: Bearer <CRON_SECRET>`;
 * without CRON_SECRET set it refuses every call. It runs once per Pakistan day even if called again.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET isn't set" }, { status: 503 });
  const given = req.headers.get("authorization") ?? "";
  if (!timingSafeEqual(digest(given), digest(`Bearer ${secret}`))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
