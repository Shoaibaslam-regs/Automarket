import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { clientIp, hitRateLimit } from "@/lib/rateLimit";
import { emailQuery } from "@/lib/accountTokens";
import { maskDestination, type CodeChannel } from "@/lib/signupCode";
import { issueSignupCode } from "@/lib/signupCodes";
import { reportError } from "@/lib/errorLog";

/**
 * Sends a new sign-up code. Body: { email, channel?: "email" | "phone" }. Always answers the same way (no account
 * enumeration): for an account still waiting, `sentTo` is where the new code went.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) ?? {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const wanted: CodeChannel = body.channel === "phone" ? "phone" : "email";
    if (!email.includes("@")) return NextResponse.json({ error: "Enter your email address" }, { status: 400 });
    const [byIp, byEmail] = await Promise.all([hitRateLimit("verifyEmailResendIp", clientIp(req)), hitRateLimit("verifyEmailResend", email)]);
    if (!byIp.ok || !byEmail.ok) {
      const retryAfter = Math.max(byIp.ok ? 0 : byIp.retryAfterSec, byEmail.ok ? 0 : byEmail.retryAfterSec);
      return NextResponse.json({ error: "Too many codes sent. Check your inbox or messages, or try again later.", code: "RATE_LIMITED", retryAfter }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
    }
    await connectDB();
    const user = await User.findOne({ ...emailQuery(email), emailVerifyRequired: true }).select("_id");
    if (!user) return NextResponse.json({ ok: true, channel: "email", sentTo: maskDestination("email", email) });
    const sent = await issueSignupCode(String(user._id), wanted);
    return NextResponse.json({ ok: true, channel: sent.channel, sentTo: maskDestination(sent.channel, sent.to) });
  } catch (error) {
    reportError("Resend sign-up code error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
