import crypto from "node:crypto";
import { User } from "@/models/User";
import { sendSignupCodeEmail } from "@/lib/email";
import { sendSms, smsConfigured } from "@/lib/sms";
import { normalizePkMobile } from "@/lib/phone";
import { SIGNUP_CODE_LENGTH, SIGNUP_CODE_MINUTES, type CodeChannel } from "@/lib/signupCode";
import { reportError } from "@/lib/errorLog";

/** Sign-up codes by SMS are switched off for now: every code goes by email and the pages hide the SMS choice. Set to false to offer SMS again. */
const SMS_CODES_PAUSED = true;

/** Codes by text message need SMS set up (Twilio); in development they're printed in the server log instead. */
export const phoneCodesAvailable = () => !SMS_CODES_PAUSED && (smsConfigured() || process.env.NODE_ENV !== "production");

/** The stored form of a code: tied to the account, so a hash can't be reused for another one. */
export const hashSignupCode = (userId: string, code: string) => crypto.createHash("sha256").update(`${userId}:${code}`).digest("hex");

/**
 * Makes a new 6-digit code for an account that hasn't confirmed yet, saves only its hash (valid for
 * SIGNUP_CODE_MINUTES, wrong guesses reset), and sends it by email or SMS. Falls back to email when the phone
 * can't be used (no SMS, not a Pakistani mobile, or verified on another account). Returns where it went. Sending errors are logged, never thrown, so callers answer the same way.
 */
export async function issueSignupCode(userId: string, wanted: CodeChannel): Promise<{ channel: CodeChannel; to: string }> {
  const user = await User.findById(userId).select("name email phone");
  if (!user) throw new Error("No such account");
  const phone = normalizePkMobile(user.phone);
  // A number already verified on another account can't be verified again, so its code goes by email
  const phoneUsable = !!phone && phoneCodesAvailable() && !(await User.exists({ _id: { $ne: user._id }, verifiedPhone: phone }));
  const channel: CodeChannel = wanted === "phone" && phoneUsable ? "phone" : "email";
  const code = crypto.randomInt(0, 10 ** SIGNUP_CODE_LENGTH).toString().padStart(SIGNUP_CODE_LENGTH, "0");
  user.signupCodeHash = hashSignupCode(String(user._id), code);
  user.signupCodeExpires = new Date(Date.now() + SIGNUP_CODE_MINUTES * 60 * 1000);
  user.signupCodeTries = 0;
  user.signupCodeChannel = channel;
  await user.save();

  const to = channel === "phone" ? phone! : user.email;
  if (process.env.NODE_ENV !== "production") console.log(`[dev] Sign-up code for ${to}: ${code}`);
  try {
    if (channel === "phone") await sendSms(to, `AutoGO code: ${code}. It works for ${SIGNUP_CODE_MINUTES} minutes. Never share it.`);
    else await sendSignupCodeEmail({ to, name: user.name, code, minutes: SIGNUP_CODE_MINUTES });
  } catch (e) {
    reportError(`Sign-up code ${channel === "phone" ? "SMS" : "email"} failed:`, e);
  }
  return { channel, to };
}
