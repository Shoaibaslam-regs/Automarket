import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { RateLimit } from "@/models/RateLimit";
import { clientIp, rateLimitResponse } from "@/lib/rateLimit";

/**
 * Sets a new password from a forgot-password link. Body: { token, password }.
 * The token works once and only until it expires; using it also lifts any sign-in lock on the account.
 */
export async function POST(req: NextRequest) {
  try {
    // Guessing tokens is pointless (256 bits), but cap attempts anyway
    const limited = await rateLimitResponse("passwordResetIp", clientIp(req), "attempts");
    if (limited) return limited;

    const { token, password } = await req.json().catch(() => ({}));
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
      return NextResponse.json({ error: "This reset link isn't valid. Ask for a new one." }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Use at least 6 characters for your password" }, { status: 400 });
    }

    await connectDB();
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({ resetTokenHash: hash, resetTokenExpires: { $gt: new Date() } }).select("email");
    if (!user) return NextResponse.json({ error: "This reset link has expired or was already used. Ask for a new one." }, { status: 400 });

    await User.updateOne(
      { _id: user._id },
      { $set: { password: await bcrypt.hash(password, 12) }, $unset: { resetTokenHash: "", resetTokenExpires: "" } }
    );
    // The owner proved they control the email, so a sign-in lock from wrong guesses no longer applies
    await RateLimit.deleteOne({ key: `loginEmail:${user.email.toLowerCase()}` });

    return NextResponse.json({ ok: true, email: user.email });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
