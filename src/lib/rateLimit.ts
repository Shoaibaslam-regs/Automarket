import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { RateLimit } from "@/models/RateLimit";

/**
 * Rate limits counted in MongoDB, so they hold across serverless instances.
 * Each key has one document: a count and the time its window ends. The window starts at the first counted
 * request (not at a clock boundary), so "try again in 15 minutes" is true. Limits marked `lockout` also lock
 * for a full window from the moment the limit is reached (sign-in and password checks).
 * MongoDB deletes finished windows (TTL index). If the database can't be reached the request is allowed (fail open).
 */
export const RATE_LIMITS = {
  /** Failed password sign-ins, per email and per IP */
  loginEmail: { limit: 5, windowSec: 15 * 60, lockout: true },
  // Generous per IP: mobile networks put many users behind one address
  loginIp: { limit: 30, windowSec: 15 * 60, lockout: true },
  /** Accounts created per IP (only successful sign-ups count) */
  register: { limit: 10, windowSec: 60 * 60 },
  /** Forgot-password emails, per email and per IP */
  passwordResetEmail: { limit: 3, windowSec: 60 * 60 },
  passwordResetIp: { limit: 10, windowSec: 60 * 60 },
  /** "Send a new code" for a new account's sign-up code, per email and per IP */
  verifyEmailResend: { limit: 5, windowSec: 60 * 60 },
  verifyEmailResendIp: { limit: 15, windowSec: 60 * 60 },
  /** Blocking people in Messages, per user (stops block/unblock games) */
  blocks: { limit: 30, windowSec: 24 * 60 * 60 },
  /** Admin sign-in codes emailed per admin (each one also allows only ADMIN_CODE_TRIES guesses) */
  adminCodeSend: { limit: 5, windowSec: 15 * 60 },
  /** Wrong sign-up codes per IP (each code also allows only SIGNUP_CODE_TRIES guesses) */
  signupCodeIp: { limit: 30, windowSec: 15 * 60, lockout: true },
  /** Phone verification codes: sends per user and per number, and wrong codes per user */
  phoneOtpUser: { limit: 3, windowSec: 15 * 60, lockout: true },
  phoneOtpNumber: { limit: 5, windowSec: 24 * 60 * 60 },
  /** Reports of listings, deals and businesses, per user */
  reports: { limit: 10, windowSec: 24 * 60 * 60 },
  /** Wrong admin access keys typed on /login, and failed admin sign-ins, per IP */
  adminKey: { limit: 5, windowSec: 15 * 60, lockout: true },
  adminLogin: { limit: 5, windowSec: 15 * 60, lockout: true },
  /** Wrong passwords when the platform owner changes the admin access key */
  adminKeyChange: { limit: 5, windowSec: 15 * 60, lockout: true },
  /** Wrong passwords when deleting an account */
  accountDelete: { limit: 5, windowSec: 15 * 60, lockout: true },
  /** AI calls cost money per request */
  aiInspection: { limit: 10, windowSec: 24 * 60 * 60 },
  vehicleImages: { limit: 30, windowSec: 60 * 60 },
  /** Handover and return condition photos (no AI check), per file */
  checkPhotos: { limit: 60, windowSec: 60 * 60 },
  /** Picture uploads (no AI check, but each is stored), per user: stops storage from being filled. Saving a new
   *  profile picture is limited further by src/lib/profilePicture.ts (30 days, then 6 months between changes). */
  profileImage: { limit: 10, windowSec: 60 * 60 },
  businessLogo: { limit: 10, windowSec: 60 * 60 },
  messages: { limit: 30, windowSec: 60 },
  support: { limit: 5, windowSec: 60 * 60 },
  reviews: { limit: 5, windowSec: 60 * 60 },
  bookings: { limit: 10, windowSec: 60 * 60 },
  purchases: { limit: 10, windowSec: 60 * 60 },
  savedSearches: { limit: 20, windowSec: 60 * 60 },
  /** Browser crash reports sent to the admin Errors page, per IP */
  clientErrors: { limit: 20, windowSec: 60 * 60 },
  /** Send feedback (topic FEEDBACK), per user: two delivered a month. Counted after sending, so a failed send doesn't use one up */
  feedback: { limit: 2, windowSec: 30 * 24 * 60 * 60 },
  /** Sponsored ad views and taps (POST /api/sponsored/track), per IP: generous, since one page shows several ads */
  adTrack: { limit: 300, windowSec: 60 * 60 },
  /** Admin System usage "Refresh" (reads the database's size and calls UploadThing), per admin */
  usageRefresh: { limit: 10, windowSec: 10 * 60 },
  /** The daily cron, keyed by Pakistan day, so a repeated call doesn't send the reminders twice */
  cronDaily: { limit: 1, windowSec: 20 * 60 * 60 },
} as const satisfies Record<string, { limit: number; windowSec: number; lockout?: boolean }>;

export type RateLimitName = keyof typeof RATE_LIMITS;

export type RateResult = { ok: boolean; remaining: number; retryAfterSec: number };

const docKey = (name: RateLimitName, id: string) => `${name}:${id}`;
const secondsUntil = (d: Date) => Math.max(1, Math.ceil((d.getTime() - Date.now()) / 1000));
const settings = (name: RateLimitName) => RATE_LIMITS[name] as { limit: number; windowSec: number; lockout?: boolean };

/**
 * Counts one more request for `id` (a user id, email or IP) under `name`, and says whether it's within the limit.
 * Pass `amount` to count several at once (e.g. a batch of uploaded files).
 */
export async function hitRateLimit(name: RateLimitName, id: string, amount = 1): Promise<RateResult> {
  const { limit, windowSec, lockout } = settings(name);
  const now = new Date();
  const key = docKey(name, id);
  try {
    await connectDB();
    // Count within the running window…
    let doc = await RateLimit.findOneAndUpdate({ key, expiresAt: { $gt: now } }, { $inc: { count: amount } }, { new: true }).lean<{ count: number; expiresAt: Date }>();
    if (!doc) {
      // …or start a new one from now
      const fresh = { count: amount, expiresAt: new Date(now.getTime() + windowSec * 1000) };
      try {
        doc = await RateLimit.findOneAndUpdate({ key, $or: [{ expiresAt: { $lte: now } }, { expiresAt: { $exists: false } }] }, { $set: fresh }, { upsert: true, new: true }).lean<{ count: number; expiresAt: Date }>();
      } catch (e) {
        // Another request started the window at the same moment; count against it
        if ((e as { code?: number }).code !== 11000) throw e;
        doc = await RateLimit.findOneAndUpdate({ key }, { $inc: { count: amount } }, { new: true }).lean<{ count: number; expiresAt: Date }>();
      }
    }
    if (!doc) return { ok: true, remaining: limit, retryAfterSec: windowSec };
    // Reaching the limit locks for a full window from now
    if (lockout && doc.count >= limit) {
      const until = new Date(now.getTime() + windowSec * 1000);
      await RateLimit.updateOne({ key }, { $set: { expiresAt: until } });
      doc = { ...doc, expiresAt: until };
    }
    return { ok: doc.count <= limit, remaining: Math.max(0, limit - doc.count), retryAfterSec: secondsUntil(doc.expiresAt) };
  } catch (e) {
    console.error(`Rate limit ${name} unavailable, allowing request:`, e);
    return { ok: true, remaining: limit, retryAfterSec: windowSec };
  }
}

/** Whether `id` is already at the limit, without counting this request (for "count failures only" limits like sign-in). */
export async function isRateLimited(name: RateLimitName, id: string): Promise<RateResult> {
  const { limit, windowSec } = settings(name);
  try {
    await connectDB();
    const doc = await RateLimit.findOne({ key: docKey(name, id), expiresAt: { $gt: new Date() } }).select("count expiresAt").lean<{ count: number; expiresAt: Date }>();
    if (!doc) return { ok: true, remaining: limit, retryAfterSec: windowSec };
    return { ok: doc.count < limit, remaining: Math.max(0, limit - doc.count), retryAfterSec: secondsUntil(doc.expiresAt) };
  } catch (e) {
    console.error(`Rate limit ${name} unavailable, allowing request:`, e);
    return { ok: true, remaining: limit, retryAfterSec: windowSec };
  }
}

// Re-exported so server routes keep importing it from here
export { waitText } from "@/lib/waitText";
import { waitText } from "@/lib/waitText";

/** The caller's IP address as Vercel and most proxies pass it, for limits on signed-out actions. */
export function clientIp(req: { headers: Headers }): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/**
 * For API routes: counts the request and returns a 429 response when over the limit, or null to carry on.
 *   const limited = await rateLimitResponse("messages", session.user.id); if (limited) return limited;
 */
export async function rateLimitResponse(name: RateLimitName, id: string, what = "requests"): Promise<NextResponse | null> {
  const r = await hitRateLimit(name, id);
  if (r.ok) return null;
  return NextResponse.json(
    { error: `Too many ${what}. Please try again in ${waitText(r.retryAfterSec)}.`, code: "RATE_LIMITED", retryAfter: r.retryAfterSec },
    { status: 429, headers: { "Retry-After": String(r.retryAfterSec) } }
  );
}
