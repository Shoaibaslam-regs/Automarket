import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { PhoneOtp } from "@/models/PhoneOtp";
import { normalizePkMobile } from "@/lib/phone";
import { hitRateLimit, waitText } from "@/lib/rateLimit";
import { OTP_TTL_MS, hashOtp, newOtp } from "@/lib/phoneOtp";
import { SmsNotConfiguredError, sendSms } from "@/lib/sms";
import { reportError } from "@/lib/errorLog";

/**
 * Texts a 6-digit verification code to a Pakistani mobile number. Body: { phone }.
 * A number already verified on another account can't be used. Limited per user and per number.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { phone: raw } = await req.json().catch(() => ({}));
    const phone = normalizePkMobile(raw);
    if (!phone) return NextResponse.json({ error: "Enter a Pakistani mobile number, e.g. 0300 1234567" }, { status: 400 });

    await connectDB();
    const me = new mongoose.Types.ObjectId(session.user.id);
    if (await User.exists({ _id: { $ne: me }, verifiedPhone: phone })) {
      return NextResponse.json({ error: "This number is already verified on another AutoMarket account." }, { status: 409 });
    }

    const [byUser, byNumber] = await Promise.all([hitRateLimit("phoneOtpUser", session.user.id), hitRateLimit("phoneOtpNumber", phone)]);
    if (!byUser.ok || !byNumber.ok) {
      const retryAfter = Math.max(byUser.ok ? 0 : byUser.retryAfterSec, byNumber.ok ? 0 : byNumber.retryAfterSec);
      return NextResponse.json(
        { error: `Too many codes requested. Please try again in ${waitText(retryAfter)}.`, code: "RATE_LIMITED", retryAfter },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const code = newOtp();
    await PhoneOtp.findOneAndUpdate(
      { userId: me },
      { $set: { phone, codeHash: hashOtp(code, session.user.id), attempts: 0, expiresAt: new Date(Date.now() + OTP_TTL_MS) } },
      { upsert: true }
    );
    try {
      await sendSms(phone, `Your AutoMarket verification code is ${code}. It expires in 10 minutes. Don't share it with anyone.`);
    } catch (e) {
      await PhoneOtp.deleteOne({ userId: me });
      if (e instanceof SmsNotConfiguredError) {
        return NextResponse.json({ error: "Phone verification isn't available yet. Please try again later." }, { status: 503 });
      }
      reportError("Verification SMS failed:", e);
      return NextResponse.json({ error: "We couldn't send the code. Check the number and try again." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, phone, expiresInSec: OTP_TTL_MS / 1000 });
  } catch (error) {
    reportError("Phone send-code error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
