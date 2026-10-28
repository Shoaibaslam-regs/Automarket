// Server-only. Every admin except the platform owner opens the hidden admin form on /login with a personal key.
// Keys are long random strings, so a plain SHA-256 is safe to store and look up (no salt needed, unlike passwords);
// the key itself is shown once, to the full admin who made it, and never stored. A new key replaces the old one, and
// removing someone's admin role deletes theirs.
import { createHash, randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { User } from "@/models/User";

export const hashPersonalKey = (key: string) => createHash("sha256").update(key).digest("hex");

/** "AG-" and 24 random letters and digits: no "@" or spaces, so the login page treats it as a key, not an email. */
function newKey() {
  return `AG-${randomBytes(18).toString("base64url").replace(/[-_]/g, "x")}`;
}

/** Makes a new personal key for an admin and returns it (the only time it can be seen). */
export async function issuePersonalKey(userId: string | mongoose.Types.ObjectId): Promise<string> {
  const key = newKey();
  await User.updateOne({ _id: userId, role: "ADMIN" }, { $set: { adminKeyHash: hashPersonalKey(key), adminKeyCreatedAt: new Date() } });
  return key;
}

/** The admin a typed personal key belongs to, or null. */
export async function adminForPersonalKey(input: string): Promise<{ _id: mongoose.Types.ObjectId } | null> {
  if (!/^AG-[A-Za-z0-9]{20,40}$/.test(input)) return null;
  return User.findOne({ adminKeyHash: hashPersonalKey(input), role: "ADMIN" }).select("_id").lean<{ _id: mongoose.Types.ObjectId }>();
}
