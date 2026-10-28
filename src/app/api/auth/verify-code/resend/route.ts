import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { clientIp, hitRateLimit } from "@/lib/rateLimit";
import { emailQuery } from "@/lib/accountTokens";
import { maskDestination, type CodeChannel } from "@/lib/signupCode";
import { issueSignupCode } from "@/lib/signupCodes";
import { RESEND_WAITS, secondsUntilResend } from "@/lib/resendWait";
import { normalizePkMobile } from "@/lib/phone";
import { waitText } from "@/lib/waitText";
import { reportError } from "@/lib/errorLog";

/**
 * Sends a new sign-up code. Body: { email, channel?: "email" | "phone" }. Always answers the same way (no account
 * enumeration): for an account still waiting, `sentTo` is where the new code went.
 */
/** "Wait before asking for another code", with where the earlier (still working) code went. */
function tooSoon(seconds: number, channel: CodeChannel, to: string) {
  return NextResponse.json(
    { error: `Please wait ${waitText(seconds)} before asking for another code. The last one still works.`, code: "RATE_LIMITED", retryAfter: seconds, channel, sentTo: maskDestination(channel, to) },
    { status: 429, headers: { "Retry-After": String(seconds) } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) ?? {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const wanted: CodeChannel = body.channel === "phone" ? "phone" : "email";
    if (!email.includes("@")) return NextResponse.json({ error: "Enter your email address" }, { status: 400 });
    await connectDB();
    const user = await User.findOne({ ...emailQuery(email), emailVerifyRequired: true })
      .select("_id email phone signupCodeChannel signupCodeSentAt signupCodeSends")
      .lean<{ _id: unknown; email: string; phone?: string; signupCodeChannel?: string; signupCodeSentAt?: Date; signupCodeSends?: number }>();
    // Too soon after the last code: refused before the hourly caps, so pressing early doesn't use one up
    const early = user ? secondsUntilResend(user.signupCodeSends, user.signupCodeSentAt) : 0;
    if (user && early > 0) {
      const phone = user.signupCodeChannel === "phone" ? normalizePkMobile(user.phone) : null;
      return tooSoon(early, phone ? "phone" : "email", phone ?? user.email);
    }
    const [byIp, byEmail] = await Promise.all([hitRateLimit("verifyEmailResendIp", clientIp(req)), hitRateLimit("verifyEmailResend", email)]);
    if (!byIp.ok || !byEmail.ok) {
      const retryAfter = Math.max(byIp.ok ? 0 : byIp.retryAfterSec, byEmail.ok ? 0 : byEmail.retryAfterSec);
      return NextResponse.json({ error: "Too many codes sent. Check your inbox or messages, or try again later.", code: "RATE_LIMITED", retryAfter }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
    }
    if (!user) return NextResponse.json({ ok: true, channel: "email", sentTo: maskDestination("email", email), resendIn: RESEND_WAITS[0] });
    const sent = await issueSignupCode(String(user._id), wanted);
    // Each code in a row waits longer (src/lib/resendWait.ts); the earlier code still works meanwhile
    if (!sent.sent) return tooSoon(sent.resendIn, sent.channel, sent.to);
    return NextResponse.json({ ok: true, channel: sent.channel, sentTo: maskDestination(sent.channel, sent.to), resendIn: sent.resendIn });
  } catch (error) {
    reportError("Resend sign-up code error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
