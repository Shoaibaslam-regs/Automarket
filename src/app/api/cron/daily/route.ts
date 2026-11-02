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
  // Trimmed: a value pasted into Vercel (or piped into `vercel env add`) often ends with a stray space or newline,
  // which made every call fail as Unauthorized
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET isn't set" }, { status: 503 });
  const given = (req.headers.get("authorization") ?? "").trim();
  // Two different refusals (neither says anything about the secret): opening the address in a browser sends no
  // header at all, which is expected; a header with the wrong value means the secret doesn't match
  if (!given) {
    return NextResponse.json({ error: "Unauthorized: no Authorization header. Vercel's cron sends it; a browser can't, so test with the Run button in Vercel → Settings → Cron Jobs, or with curl." }, { status: 401 });
  }
  if (!timingSafeEqual(digest(given), digest(`Bearer ${secret}`))) {
    return NextResponse.json({ error: "Unauthorized: the secret sent doesn't match CRON_SECRET for this deployment." }, { status: 401 });
  }

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
