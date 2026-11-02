import { createHash, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

const digest = (s: string) => createHash("sha256").update(s).digest();

/**
 * Checks a scheduled call's `Authorization: Bearer <CRON_SECRET>` (Vercel's cron sends it; so must an outside
 * scheduler). Returns the refusal to send, or null when the call may run. Without CRON_SECRET every call is refused.
 */
export function cronRefusal(req: NextRequest): NextResponse | null {
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
  return null;
}
