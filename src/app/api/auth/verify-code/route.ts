import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { clientIp, hitRateLimit, isRateLimited, waitText } from "@/lib/rateLimit";
import { emailQuery } from "@/lib/accountTokens";
import { cleanCode, SIGNUP_CODE_TRIES } from "@/lib/signupCode";
import { hashSignupCode, phoneCodesAvailable } from "@/lib/signupCodes";
import { formatPkMobile, normalizePkMobile } from "@/lib/phone";
import { reportError } from "@/lib/errorLog";

/** Whether the sign-up pages may offer "send the code by SMS". */
export async function GET() {
  return NextResponse.json({ phone: phoneCodesAvailable() });
}

const WRONG = { error: "That code isn't right. Check it and try again, or send a new code.", code: "WRONG_CODE" };

/**
 * Confirms a new account with the 6-digit code from its email or SMS. Body: { email, code }.
 * The code lasts SIGNUP_CODE_MINUTES and allows SIGNUP_CODE_TRIES guesses; wrong codes also count per IP.
 * An email code confirms the email; an SMS code also verifies the phone (unless another account already has it).
 * Afterwards the page signs in with the password it still holds.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const limit = await isRateLimited("signupCodeIp", ip);
    if (!limit.ok) {
      return NextResponse.json(
        { error: `Too many wrong codes. Try again in ${waitText(limit.retryAfterSec)}.`, code: "RATE_LIMITED", retryAfter: limit.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }
    const body = (await req.json().catch(() => null)) ?? {};
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const code = cleanCode(body.code);
    if (!email.includes("@") || !code) return NextResponse.json({ error: "Enter the 6-digit code" }, { status: 400 });

    await connectDB();
    const user = await User.findOne({ ...emailQuery(email), emailVerifyRequired: true })
      .select("phone signupCodeHash signupCodeExpires signupCodeTries signupCodeChannel");
    // Unknown, already confirmed and code-less accounts all get the same "wrong code"
    if (!user?.signupCodeHash) {
      await hitRateLimit("signupCodeIp", ip);
      return NextResponse.json(WRONG, { status: 400 });
    }
    if (!user.signupCodeExpires || user.signupCodeExpires < new Date() || (user.signupCodeTries ?? 0) >= SIGNUP_CODE_TRIES) {
      return NextResponse.json({ error: "This code has expired. Send a new code.", code: "CODE_EXPIRED" }, { status: 400 });
    }
    const expected = Buffer.from(user.signupCodeHash, "hex");
    const given = Buffer.from(hashSignupCode(String(user._id), code), "hex");
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
      await Promise.all([
        User.updateOne({ _id: user._id }, { $inc: { signupCodeTries: 1 } }),
        hitRateLimit("signupCodeIp", ip),
      ]);
      return NextResponse.json(WRONG, { status: 400 });
    }

    const now = new Date();
    const set: Record<string, unknown> = {};
    if (user.signupCodeChannel === "phone") {
      const phone = normalizePkMobile(user.phone);
      // A number is verified on one account only; the account is confirmed either way
      if (phone && !(await User.exists({ _id: { $ne: user._id }, verifiedPhone: phone }))) {
        Object.assign(set, { verifiedPhone: phone, phoneVerifiedAt: now, phone: formatPkMobile(phone) });
      }
    } else {
      set.emailVerified = now;
    }
    // Only one request can use the code: the hash must still be there
    const done = await User.updateOne(
      { _id: user._id, signupCodeHash: user.signupCodeHash },
      {
        $set: set,
        $unset: { emailVerifyRequired: "", emailVerifyTokenHash: "", emailVerifyExpires: "", signupCodeHash: "", signupCodeExpires: "", signupCodeTries: "", signupCodeChannel: "" },
      }
    );
    if (!done.modifiedCount) return NextResponse.json(WRONG, { status: 400 });
    return NextResponse.json({ ok: true, phoneVerified: "verifiedPhone" in set });
  } catch (error) {
    reportError("Verify sign-up code error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
