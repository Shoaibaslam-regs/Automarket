import crypto from "node:crypto";
import { User } from "@/models/User";
import { sendSignupCodeEmail } from "@/lib/email";
import { sendSms, smsConfigured } from "@/lib/sms";
import { normalizePkMobile } from "@/lib/phone";
import { SIGNUP_CODE_LENGTH, SIGNUP_CODE_MINUTES, type CodeChannel } from "@/lib/signupCode";
import { reportError } from "@/lib/errorLog";
import { resendWaitAfter, secondsUntilResend, streakCount } from "@/lib/resendWait";

/** Sign-up codes by SMS are switched off for now: every code goes by email and the pages hide the SMS choice. Set to false to offer SMS again. */
const SMS_CODES_PAUSED = true;

/** Codes by text message need SMS set up (Twilio); in development they're printed in the server log instead. */
export const phoneCodesAvailable = () => !SMS_CODES_PAUSED && (smsConfigured() || process.env.NODE_ENV !== "production");

/** The stored form of a code: tied to the account, so a hash can't be reused for another one. */
export const hashSignupCode = (userId: string, code: string) => crypto.createHash("sha256").update(`${userId}:${code}`).digest("hex");

/**
 * Makes a new 6-digit code for an account that hasn't confirmed yet, saves only its hash (valid for
 * SIGNUP_CODE_MINUTES, wrong guesses reset), and sends it by email or SMS. Falls back to email when the phone
 * can't be used (no SMS, not a Pakistani mobile, or verified on another account). Sending errors are logged, never
 * thrown, so callers answer the same way.
 *
 * Codes in a row wait longer each time (1, 2, 5, then 10 minutes; src/lib/resendWait.ts). Asked too soon, nothing is
 * sent and the earlier code stays valid: `sent` is false and `resendIn` says how long is left. After a send,
 * `resendIn` is the wait before the next one, for the form's countdown.
 */
export async function issueSignupCode(userId: string, wanted: CodeChannel): Promise<{ channel: CodeChannel; to: string; sent: boolean; resendIn: number }> {
  const user = await User.findById(userId).select("name email phone signupCodeChannel signupCodeSentAt signupCodeSends");
  if (!user) throw new Error("No such account");
  const phone = normalizePkMobile(user.phone);
  const wait = secondsUntilResend(user.signupCodeSends, user.signupCodeSentAt);
  if (wait > 0) {
    const last: CodeChannel = user.signupCodeChannel === "phone" && phone ? "phone" : "email";
    return { channel: last, to: last === "phone" ? phone! : user.email, sent: false, resendIn: wait };
  }
  // A number already verified on another account can't be verified again, so its code goes by email
  const phoneUsable = !!phone && phoneCodesAvailable() && !(await User.exists({ _id: { $ne: user._id }, verifiedPhone: phone }));
  const channel: CodeChannel = wanted === "phone" && phoneUsable ? "phone" : "email";
  const code = crypto.randomInt(0, 10 ** SIGNUP_CODE_LENGTH).toString().padStart(SIGNUP_CODE_LENGTH, "0");
  const streak = streakCount(user.signupCodeSends, user.signupCodeSentAt) + 1;
  // Only one request gets to send: the last send time must still be the one read above
  const claimed = await User.updateOne(
    { _id: user._id, signupCodeSentAt: user.signupCodeSentAt ?? null },
    { $set: {
      signupCodeHash: hashSignupCode(String(user._id), code),
      signupCodeExpires: new Date(Date.now() + SIGNUP_CODE_MINUTES * 60 * 1000),
      signupCodeTries: 0,
      signupCodeChannel: channel,
      signupCodeSentAt: new Date(),
      signupCodeSends: streak,
    } }
  );
  if (!claimed.modifiedCount) return { channel, to: channel === "phone" ? phone! : user.email, sent: false, resendIn: resendWaitAfter(streak) };

  const to = channel === "phone" ? phone! : user.email;
  if (process.env.NODE_ENV !== "production") console.log(`[dev] Sign-up code for ${to}: ${code}`);
  try {
    if (channel === "phone") await sendSms(to, `AutoGO code: ${code}. It works for ${SIGNUP_CODE_MINUTES} minutes. Never share it.`);
    else await sendSignupCodeEmail({ to, name: user.name, code, minutes: SIGNUP_CODE_MINUTES });
  } catch (e) {
    reportError(`Sign-up code ${channel === "phone" ? "SMS" : "email"} failed:`, e);
  }
  return { channel, to, sent: true, resendIn: resendWaitAfter(streak) };
}
