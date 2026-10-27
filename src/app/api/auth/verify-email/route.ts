import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { hashLinkToken } from "@/lib/accountTokens";
import { reportError } from "@/lib/errorLog";

/**
 * The link in confirmation emails sent before sign-up codes replaced them (`?token=`; links last 24 hours, so
 * this route can go once none are left). Confirms the email and opens the sign-in page with a note;
 * an expired or used link opens it with a "send it again" note instead. Only a hash of the token is stored.
 */
export async function GET(req: NextRequest) {
  const to = (q: string) => NextResponse.redirect(new URL(`/login?${q}`, req.nextUrl.origin));
  try {
    const token = req.nextUrl.searchParams.get("token") ?? "";
    if (!/^[0-9a-f]{64}$/.test(token)) return to("verify=invalid");
    await connectDB();
    const user = await User.findOneAndUpdate(
      { emailVerifyTokenHash: hashLinkToken(token), emailVerifyExpires: { $gt: new Date() } },
      { $set: { emailVerified: new Date() }, $unset: { emailVerifyRequired: "", emailVerifyTokenHash: "", emailVerifyExpires: "" } },
      { new: true }
    ).select("email");
    if (!user) return to("verify=invalid");
    return to(`verified=1&email=${encodeURIComponent(user.email)}`);
  } catch (error) {
    reportError("Verify email error:", error);
    return to("verify=invalid");
  }
}
