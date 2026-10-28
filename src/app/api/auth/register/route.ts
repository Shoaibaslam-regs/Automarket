import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models";
import { clientIp, hitRateLimit, isRateLimited, waitText } from "@/lib/rateLimit";
import { passwordProblem } from "@/lib/password";
import { emailQuery, newSessionKey } from "@/lib/accountTokens";
import { sendAccountExistsEmail } from "@/lib/email";
import { maskDestination, type CodeChannel } from "@/lib/signupCode";
import { issueSignupCode, phoneCodesAvailable } from "@/lib/signupCodes";
import { normalizePkMobile } from "@/lib/phone";
import { RESEND_WAITS } from "@/lib/resendWait";
import { SITE_URL } from "@/lib/site";
import { reportError } from "@/lib/errorLog";

import { turnstileRefusal, verifyTurnstile } from "@/lib/turnstile";
/**
 * Same answer whether the email is new or already registered, so sign-up can't be used to find out which is which:
 * where the code went, masked. An existing account gets no code, so no code typed for it is ever right.
 */
function codeSent(channel: CodeChannel, to: string, resendIn: number = RESEND_WAITS[0]) {
  return NextResponse.json({ ok: true, channel, sentTo: maskDestination(channel, to), resendIn }, { status: 201 });
}

/**
 * Creates an account that must confirm itself with a 6-digit code before the first sign-in.
 * Body: { name, email, phone?, password, acceptTerms, channel?: "email" | "phone" }. The code goes by email, or by
 * SMS to the phone when asked and SMS is available. An email that already has an account gets a "you already
 * have an account" email instead, and both answer with codeSent.
 */
export async function POST(req: NextRequest) {
  try {
    // Stops mass sign-ups (and free-trial farming): 10 per IP an hour, counted for every completed sign-up form
    const ip = clientIp(req);
    const limit = await isRateLimited("register", ip);
    if (!limit.ok) {
      return NextResponse.json(
        { error: `Too many new accounts from this connection. Please try again in ${waitText(limit.retryAfterSec)}.`, code: "RATE_LIMITED", retryAfter: limit.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = (await req.json().catch(() => null)) ?? {};
    // A person, not a script (Cloudflare Turnstile; skipped until its keys are set)
    if (!(await verifyTurnstile(body.cf, ip))) return turnstileRefusal();
    const { password, acceptTerms } = body;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
    const wanted: CodeChannel = body.channel === "phone" ? "phone" : "email";

    if (acceptTerms !== true) {
      return NextResponse.json({ error: "Please accept the Terms & Conditions to create an account" }, { status: 400 });
    }
    if (name.length < 2 || name.length > 60) return NextResponse.json({ error: "Enter your name (2 to 60 characters)" }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    if (phone && !/^[+\d][\d\s-]{6,19}$/.test(phone)) return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
    const weak = passwordProblem(password, { email, name });
    if (weak) return NextResponse.json({ error: weak }, { status: 400 });

    await connectDB();
    // Hashed either way, so a known email answers as slowly as a new one
    const hashedPassword = await bcrypt.hash(password, 12);
    await hitRateLimit("register", ip);

    // Emails to one address are capped (shared with "send a new code"), so sign-up can't flood an inbox from many
    // connections; over the cap nothing is sent and the answer stays the same
    const mailOk = (await hitRateLimit("verifyEmailResend", email)).ok;
    // Where a code would go, for answers that send none
    const phoneTo = wanted === "phone" && phoneCodesAvailable() ? normalizePkMobile(phone) : null;
    const noCodeSent = () => (phoneTo ? codeSent("phone", phoneTo) : codeSent("email", email));

    const existing = await User.findOne(emailQuery(email)).select("name email phone emailVerifyRequired");
    // Signed up before but never typed the code. Anyone can type any email here, so the details of the latest
    // sign-up replace the old ones: only the person reading the inbox gets the code, and confirming needs this
    // password too (verify-code), so nobody can leave a password of their own on someone else's email.
    if (existing?.emailVerifyRequired) {
      existing.name = name;
      existing.password = hashedPassword;
      existing.phone = phone;
      existing.sessionKey = newSessionKey();
      await existing.save();
      if (!mailOk) return noCodeSent();
      const sent = await issueSignupCode(String(existing._id), wanted);
      return codeSent(sent.channel, sent.to, sent.resendIn);
    }
    if (existing) {
      if (mailOk) {
        try {
          await sendAccountExistsEmail({ to: existing.email, name: existing.name, loginLink: `${SITE_URL}/login`, resetLink: `${SITE_URL}/forgot-password` });
        } catch (e) {
          reportError("Account-exists email failed:", e);
        }
      }
      return noCodeSent();
    }

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: "USER",
      termsAcceptedAt: new Date(),
      emailVerifyRequired: true,
      sessionKey: newSessionKey(),
    });
    // Sending problems are logged inside; the page offers "send a new code"
    if (!mailOk) return noCodeSent();
    const sent = await issueSignupCode(String(user._id), wanted);
    return codeSent(sent.channel, sent.to, sent.resendIn);
  } catch (error) {
    reportError("Register error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
