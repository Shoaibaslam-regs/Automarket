import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { RateLimit } from "@/models/RateLimit";
import { clientIp, rateLimitResponse } from "@/lib/rateLimit";
import { reportError } from "@/lib/errorLog";
import { passwordProblem } from "@/lib/password";
import { newSessionKey } from "@/lib/accountTokens";

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
    const weak = passwordProblem(password);
    if (weak) {
      return NextResponse.json({ error: weak }, { status: 400 });
    }

    await connectDB();
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({ resetTokenHash: hash, resetTokenExpires: { $gt: new Date() } }).select("email");
    if (!user) return NextResponse.json({ error: "This reset link has expired or was already used. Ask for a new one." }, { status: 400 });

    await User.updateOne(
      { _id: user._id },
      // A new session key signs out every device (the page then signs in here); opening the emailed link also
      // proves the email, so a pending confirmation is done too
      { $set: { password: await bcrypt.hash(password, 12), sessionKey: newSessionKey(), emailVerified: new Date() },
        $unset: { resetTokenHash: "", resetTokenExpires: "", emailVerifyRequired: "", emailVerifyTokenHash: "", emailVerifyExpires: "" } }
    );
    // The owner proved they control the email, so a sign-in lock from wrong guesses no longer applies
    await RateLimit.deleteOne({ key: `loginEmail:${user.email.toLowerCase()}` });

    return NextResponse.json({ ok: true, email: user.email });
  } catch (error) {
    reportError("Reset password error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
