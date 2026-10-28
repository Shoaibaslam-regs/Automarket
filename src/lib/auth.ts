 import NextAuth, { CredentialsSignin } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { clientIp, hitRateLimit, isRateLimited } from "@/lib/rateLimit";
import { adminGateUser } from "@/lib/adminGate";
import { consumeAdminCode } from "@/lib/adminCode";
import { emailQuery, newSessionKey } from "@/lib/accountTokens";
import { parseLoginIdentifier } from "@/lib/signupCode";

/** Signed up with a password but hasn't typed the sign-up code yet; the login page asks for it (and can resend it). */
class EmailUnverified extends CredentialsSignin {
  code = "email_unverified";
}

/** How often a session is checked against the account (session key, role); in between, the cookie is trusted. */
const RECHECK_MS = 5 * 60 * 1000;

/** The account's session key, creating one for accounts made before keys existed. */
async function sessionKeyOf(user: { _id: unknown; sessionKey?: string }) {
  if (user.sessionKey) return user.sessionKey;
  const key = newSessionKey();
  await User.updateOne({ _id: user._id, sessionKey: { $exists: false } }, { $set: { sessionKey: key } });
  return (await User.findById(user._id).select("sessionKey").lean<{ sessionKey?: string }>())?.sessionKey ?? key;
}

/**
 * Too many failed sign-ins for this email or IP. The code carries the seconds left ("rate_limited_840"),
 * so the login page can lock its button with a countdown.
 */
class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
  constructor(retryAfterSec: number) {
    super();
    this.code = `rate_limited_${retryAfterSec}`;
  }
}

/** Compared against when the email has no password account, so unknown emails take as long as wrong passwords. */
const DUMMY_HASH = "$2b$10$ArUL0ak2bQr.xXObNPvNE.SwachPpTAciiOivbk37fR9LP2Z/R/9K";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email or phone", type: "text" },
        password: { label: "Password", type: "password" },
        // "admin" from the hidden admin form on /login (see src/lib/adminGate.ts), with the emailed `code`
        portal: { label: "Portal", type: "text" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials, request) {
        const ip = clientIp(request);

        // The admin form: an admin key opened it (a signed, short-lived cookie naming that admin) and a 6-digit code
        // was emailed to them. No email or password is typed; failures are limited per IP and look like any other.
        if (credentials?.portal === "admin") {
          const adminId = adminGateUser(request.headers.get("cookie"));
          if (!adminId) return null;
          const adminLimit = await isRateLimited("adminLogin", ip);
          if (!adminLimit.ok) throw new RateLimitedSignin(adminLimit.retryAfterSec);
          await connectDB();
          const admin = await consumeAdminCode(adminId, String(credentials.code ?? "").replace(/\D/g, ""));
          if (!admin || admin.role !== "ADMIN") {
            const a = await hitRateLimit("adminLogin", ip);
            if (a.remaining === 0) throw new RateLimitedSignin(a.retryAfterSec);
            return null;
          }
          return {
            id: admin._id.toString(),
            name: admin.name,
            email: admin.email,
            image: admin.image,
            role: admin.role,
            adminAccess: admin.adminAccess,
            adminPortal: true,
            sessionKey: await sessionKeyOf(admin),
          };
        }

        if (!credentials?.email || !credentials?.password) return null;
        // The field takes an email or the account's phone number
        const id = parseLoginIdentifier(String(credentials.email));
        if (!id) return null;
        const password = String(credentials.password);
        const adminPortal = false;

        // Only failed attempts count: 5 per email and 30 per IP; reaching the limit locks sign-in for 15 minutes
        const emailKey = id.kind === "email" ? id.email : id.phone;
        const [byEmail, byIp] = await Promise.all([isRateLimited("loginEmail", emailKey), isRateLimited("loginIp", ip)]);
        if (!byEmail.ok || !byIp.ok) throw new RateLimitedSignin(Math.max(byEmail.ok ? 0 : byEmail.retryAfterSec, byIp.ok ? 0 : byIp.retryAfterSec));

        await connectDB();
        // Emails are stored lower-case now; older accounts kept the capitals they signed up with
        let user;
        let isValid = false;
        if (id.kind === "email") {
          user = await User.findOne(emailQuery(id.email));
          // The same work and the same answer whether the email is unknown or the password is wrong
          isValid = await bcrypt.compare(password, user?.password || DUMMY_HASH);
        } else {
          // Phones typed at sign-up aren't proven, so several accounts may give the same number: the one whose
          // password matches signs in (an SMS-verified number first). At most 5 are tried.
          // Oldest accounts first, so accounts made later with someone else's number can't push theirs out
          const found = await User.find({ $or: [{ verifiedPhone: id.phone }, { loginPhone: id.phone }] }).sort({ createdAt: 1, _id: 1 }).limit(5);
          found.sort((a, b) => Number(b.verifiedPhone === id.phone) - Number(a.verifiedPhone === id.phone));
          if (!found.length) await bcrypt.compare(password, DUMMY_HASH);
          for (const candidate of found) {
            if (candidate.password && (await bcrypt.compare(password, candidate.password))) {
              user = candidate;
              isValid = true;
              break;
            }
          }
          user ??= found[0];
        }
        // On the admin form a correct password for a non-admin account is still a refusal
        // The shared AutoGO Support account has no password, but refuse it outright anyway
        if (!user || !user.password || !isValid || user.isSupportAccount) {
          const [e, i] = await Promise.all([hitRateLimit("loginEmail", emailKey), hitRateLimit("loginIp", ip)]);
          // The failure that reaches the limit already locks, so the button locks straight away
          if (e.remaining === 0 || i.remaining === 0) throw new RateLimitedSignin(Math.max(e.remaining === 0 ? e.retryAfterSec : 0, i.remaining === 0 ? i.retryAfterSec : 0));
          return null;
        }

        // Right password, but the email was never confirmed (new sign-ups only; older accounts have no flag)
        if (user.emailVerifyRequired) throw new EmailUnverified();

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          adminAccess: user.adminAccess,
          adminPortal,
          sessionKey: await sessionKeyOf(user),
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        // Accounts are matched by email, so only an email Google has confirmed may open one
        if (profile?.email_verified !== true || !user.email) return false;
        await connectDB();
        const existing = await User.findOne(emailQuery(String(user.email ?? "")));
        if (!existing) {
          await User.create({
            name: user.name,
            email: String(user.email ?? "").toLowerCase(),
            image: user.image,
            emailVerified: new Date(),
            // The sign-in page says continuing with Google means agreeing to the terms
            termsAcceptedAt: new Date(),
            role: "USER",
            sessionKey: newSessionKey(),
          });
        } else if (existing.emailVerifyRequired) {
          // Google has confirmed the email, so a pending email sign-up is confirmed too. Its password was never
          // proven to belong to this person (anyone can sign up with any email), so it's dropped; Forgot password
          // sets a new one
          await User.updateOne({ _id: existing._id }, { $set: { emailVerified: new Date(), sessionKey: newSessionKey() }, $unset: { password: "", emailVerifyRequired: "", emailVerifyTokenHash: "", emailVerifyExpires: "", signupCodeHash: "", signupCodeExpires: "", signupCodeTries: "", signupCodeChannel: "" } });
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        if (account?.provider === "google") {
          // Google's user.id is Google's own id, not the account's: every route looks the account up by
          // session.user.id, so use the account that signIn found or created
          await connectDB();
          const dbUser = await User.findOne(emailQuery(String(user.email ?? ""))).select("role adminAccess sessionKey");
          if (!dbUser) return null;
          token.id = dbUser._id.toString();
          token.role = dbUser.role;
          token.adminAccess = dbUser.adminAccess;
          token.adminPortal = false;
          token.sk = await sessionKeyOf(dbUser);
        } else {
          token.id = user.id;
          token.role = user.role;
          token.adminAccess = (user as { adminAccess?: string }).adminAccess;
          // Only a sign-in through the hidden admin form opens the admin panel (proxy.ts, requireAdminApi)
          token.adminPortal = user.adminPortal === true && user.role === "ADMIN";
          token.sk = (user as { sessionKey?: string }).sessionKey;
        }
        token.checkedAt = Date.now();
        return token;
      }
      // After a password change the page sends the account's new key (from PATCH /api/profile), so this device
      // stays signed in while every other one is signed out. Only the current key is accepted.
      const sent = (session as { sessionKey?: unknown } | undefined)?.sessionKey;
      if (trigger === "update" && typeof sent === "string") {
        await connectDB();
        const current = await User.findById(token.id).select("sessionKey").lean<{ sessionKey?: string }>();
        if (current?.sessionKey === sent) {
          token.sk = current.sessionKey;
          token.checkedAt = Date.now();
        }
        return token;
      }
      // Every few minutes, check the account still exists and its session key still matches (it's replaced when
      // the password is changed or reset, or an admin changes the role), and pick up the current role
      if (token.id && Date.now() - Number(token.checkedAt ?? 0) > RECHECK_MS) {
        await connectDB();
        const current = await User.findById(token.id).select("role adminAccess sessionKey").lean<{ role: string; adminAccess?: string; sessionKey?: string }>();
        if (!current || (current.sessionKey ?? undefined) !== (token.sk ?? undefined)) return null;
        token.role = current.role;
        token.adminAccess = current.adminAccess;
        if (current.role !== "ADMIN") token.adminPortal = false;
        token.checkedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.adminAccess = token.adminAccess;
        session.user.adminPortal = token.adminPortal === true && token.role === "ADMIN";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
});