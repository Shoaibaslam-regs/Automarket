// Server-only. After an admin key opens the admin form, signing in needs a 6-digit code emailed to that admin, so a
// leaked key or password alone isn't enough, and admins who joined with Google (no password) can sign in too.
// Only sha256(userId:code) is stored; a code lasts ADMIN_CODE_MINUTES and allows ADMIN_CODE_TRIES guesses.
import crypto from "node:crypto";
import mongoose from "mongoose";
import { User } from "@/models/User";
import { sendAdminCodeEmail } from "@/lib/email";
import { reportError } from "@/lib/errorLog";

export const ADMIN_CODE_MINUTES = 10;
export const ADMIN_CODE_TRIES = 5;

const hashCode = (userId: string, code: string) => crypto.createHash("sha256").update(`admin:${userId}:${code}`).digest("hex");

/** Makes and emails a new code for this admin, replacing any earlier one. Returns the address it went to. */
export async function issueAdminCode(userId: string): Promise<string | null> {
  const user = await User.findOne({ _id: userId, role: "ADMIN" }).select("name email");
  if (!user) return null;
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  user.adminCodeHash = hashCode(String(user._id), code);
  user.adminCodeExpires = new Date(Date.now() + ADMIN_CODE_MINUTES * 60 * 1000);
  user.adminCodeTries = 0;
  await user.save();
  if (process.env.NODE_ENV !== "production") console.log(`[dev] Admin sign-in code for ${user.email}: ${code}`);
  try {
    await sendAdminCodeEmail({ to: user.email, name: user.name, code, minutes: ADMIN_CODE_MINUTES });
  } catch (e) {
    reportError("Admin code email failed:", e);
  }
  return user.email;
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
    { $unset: { adminCodeHash: "", adminCodeExpires: "", adminCodeTries: "" } }
  );
  return done.modifiedCount ? user : null;
}
