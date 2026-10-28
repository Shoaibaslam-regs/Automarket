// Server-only. After an admin key opens the admin form, signing in needs a 6-digit code emailed to that admin, so a
// leaked key or password alone isn't enough, and admins who joined with Google (no password) can sign in too.
// Only sha256(userId:code) is stored; a code lasts ADMIN_CODE_MINUTES and allows ADMIN_CODE_TRIES guesses.
import crypto from "node:crypto";
import mongoose from "mongoose";
import { User } from "@/models/User";
import { sendAdminCodeEmail } from "@/lib/email";
import { reportError } from "@/lib/errorLog";
import { resendWaitAfter, secondsUntilResend, streakCount } from "@/lib/resendWait";

export const ADMIN_CODE_MINUTES = 10;
export const ADMIN_CODE_TRIES = 5;

const hashCode = (userId: string, code: string) => crypto.createHash("sha256").update(`admin:${userId}:${code}`).digest("hex");

/** Seconds before this admin can be sent another code (0 = now), checked before the hourly cap so waiting costs nothing. */
export async function adminCodeWait(userId: string): Promise<number> {
  const user = await User.findById(userId).select("adminCodeSentAt adminCodeSends").lean<{ adminCodeSentAt?: Date; adminCodeSends?: number }>();
  return user ? secondsUntilResend(user.adminCodeSends, user.adminCodeSentAt) : 0;
}

/**
 * Makes and emails a new code for this admin, replacing any earlier one. Codes in a row wait longer (1, 2, 5, then
 * 10 minutes; src/lib/resendWait.ts): asked too soon, nothing is sent, the earlier code stays valid, `sent` is false
 * and `resendIn` is the time left. Returns null for an unknown admin.
 */
export async function issueAdminCode(userId: string): Promise<{ email: string; sent: boolean; resendIn: number } | null> {
  const user = await User.findOne({ _id: userId, role: "ADMIN" }).select("name email adminCodeSentAt adminCodeSends");
  if (!user) return null;
  const wait = secondsUntilResend(user.adminCodeSends, user.adminCodeSentAt);
  if (wait > 0) return { email: user.email, sent: false, resendIn: wait };
  const streak = streakCount(user.adminCodeSends, user.adminCodeSentAt) + 1;
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  // Only one request gets to send: the last send time must still be the one read above
  const claimed = await User.updateOne(
    { _id: user._id, adminCodeSentAt: user.adminCodeSentAt ?? null },
    { $set: {
      adminCodeHash: hashCode(String(user._id), code),
      adminCodeExpires: new Date(Date.now() + ADMIN_CODE_MINUTES * 60 * 1000),
      adminCodeTries: 0,
      adminCodeSentAt: new Date(),
      adminCodeSends: streak,
    } }
  );
  if (!claimed.modifiedCount) return { email: user.email, sent: false, resendIn: resendWaitAfter(streak) };
  if (process.env.NODE_ENV !== "production") console.log(`[dev] Admin sign-in code for ${user.email}: ${code}`);
  try {
    await sendAdminCodeEmail({ to: user.email, name: user.name, code, minutes: ADMIN_CODE_MINUTES });
  } catch (e) {
    reportError("Admin code email failed:", e);
  }
  return { email: user.email, sent: true, resendIn: resendWaitAfter(streak) };
}

/**
 * Checks a code for this admin. One try is taken before checking, so guesses sent at once can't exceed the limit; a
 * right code is used up. Returns the admin on success.
 */
export async function consumeAdminCode(userId: string, code: string) {
  if (!mongoose.Types.ObjectId.isValid(userId) || !/^\d{6}$/.test(code)) return null;
  const user = await User.findOneAndUpdate(
    { _id: userId, role: "ADMIN", adminCodeHash: { $exists: true }, adminCodeExpires: { $gt: new Date() }, adminCodeTries: { $lt: ADMIN_CODE_TRIES } },
    { $inc: { adminCodeTries: 1 } },
    { returnDocument: "after" }
  );
  if (!user?.adminCodeHash) return null;
  const expected = Buffer.from(user.adminCodeHash, "hex");
  const given = Buffer.from(hashCode(String(user._id), code), "hex");
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  const done = await User.updateOne(
    { _id: user._id, adminCodeHash: user.adminCodeHash },
    // Signed in: the next sign-in starts the resend count again
    { $unset: { adminCodeHash: "", adminCodeExpires: "", adminCodeTries: "", adminCodeSentAt: "", adminCodeSends: "" } }
  );
  return done.modifiedCount ? user : null;
}
