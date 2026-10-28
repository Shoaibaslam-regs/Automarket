import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { clientIp, hitRateLimit } from "@/lib/rateLimit";
import { sendPasswordResetEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import { reportError } from "@/lib/errorLog";

import { turnstileRefusal, verifyTurnstile } from "@/lib/turnstile";
/** How long a reset link works. */
const RESET_TTL_MS = 60 * 60 * 1000;

/**
 * Emails a one-time password-reset link. Body: { email }.
 * Always answers the same way, so it can't be used to find out which emails have accounts.
 * Only a SHA-256 hash of the token is stored; the link expires in an hour.
 */
export async function POST(req: NextRequest) {
  const done = NextResponse.json({ ok: true, message: "If an account uses that email, we've sent a link to reset the password. Check your inbox and spam folder." });
  try {
    const { email: raw, cf } = await req.json().catch(() => ({}));
    const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) return NextResponse.json({ error: "Enter your email address" }, { status: 400 });
    if (!(await verifyTurnstile(cf, clientIp(req)))) return turnstileRefusal();

    const [byIp, byEmail] = await Promise.all([hitRateLimit("passwordResetIp", clientIp(req)), hitRateLimit("passwordResetEmail", email)]);
    if (!byIp.ok || !byEmail.ok) {
      const retryAfter = Math.max(byIp.ok ? 0 : byIp.retryAfterSec, byEmail.ok ? 0 : byEmail.retryAfterSec);
      return NextResponse.json(
        { error: "Too many reset requests. Please check your inbox, or try again later.", code: "RATE_LIMITED", retryAfter },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    await connectDB();
    // Emails are stored as typed at sign-up, so match without regard to case
    const user = await User.findOne({ email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }).select("name email isSupportAccount");
    // The shared AutoGO Support account can never get a password
    if (!user || user.isSupportAccount) return done;

    const token = crypto.randomBytes(32).toString("hex");
    user.resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
    user.resetTokenExpires = new Date(Date.now() + RESET_TTL_MS);
    await user.save();

    const link = `${SITE_URL}/reset-password?token=${token}`;
    if (process.env.NODE_ENV !== "production") console.log(`[dev] Reset password: ${link}`);
    try {
      await sendPasswordResetEmail({ to: user.email, name: user.name, link });
    } catch (e) {
      // Logged for the admin Errors page, but answered like every other request: an error here only for
      // registered emails would tell anyone which emails have accounts
      reportError("Password reset email failed:", e);
    }
    return done;
  } catch (error) {
    reportError("Forgot password error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
