import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { PhoneOtp } from "@/models/PhoneOtp";
import { OTP_MAX_ATTEMPTS, hashOtp } from "@/lib/phoneOtp";
import { formatPkMobile } from "@/lib/phone";
import { reportError } from "@/lib/errorLog";

/**
 * Checks the texted code. Body: { code }. On success the number becomes the account's verified phone
 * (and its profile phone). Each code allows OTP_MAX_ATTEMPTS wrong tries, then a new code is needed.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { code } = await req.json().catch(() => ({}));
    const digits = typeof code === "string" ? code.replace(/\D/g, "") : "";
    if (digits.length !== 6) return NextResponse.json({ error: "Enter the 6-digit code from the SMS" }, { status: 400 });

    await connectDB();
    const me = new mongoose.Types.ObjectId(session.user.id);
    const otp = await PhoneOtp.findOne({ userId: me, expiresAt: { $gt: new Date() } });
    if (!otp) return NextResponse.json({ error: "This code has expired. Ask for a new one." }, { status: 400 });
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      await otp.deleteOne();
      return NextResponse.json({ error: "Too many wrong codes. Ask for a new one." }, { status: 400 });
    }

    if (hashOtp(digits, session.user.id) !== otp.codeHash) {
      otp.attempts += 1;
      await otp.save();
      const left = OTP_MAX_ATTEMPTS - otp.attempts;
      return NextResponse.json({ error: left > 0 ? `That code isn't right. ${left} tr${left === 1 ? "y" : "ies"} left.` : "Too many wrong codes. Ask for a new one." }, { status: 400 });
    }

    // Someone else may have verified the same number in the meantime
    if (await User.exists({ _id: { $ne: me }, verifiedPhone: otp.phone })) {
      await otp.deleteOne();
      return NextResponse.json({ error: "This number is already verified on another AutoGO account." }, { status: 409 });
    }
    const now = new Date();
    await User.updateOne({ _id: me }, { $set: { verifiedPhone: otp.phone, phoneVerifiedAt: now, phone: formatPkMobile(otp.phone) } });
    await otp.deleteOne();
    return NextResponse.json({ ok: true, verifiedPhone: otp.phone, phone: formatPkMobile(otp.phone), phoneVerifiedAt: now });
  } catch (error) {
    reportError("Phone verify error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
