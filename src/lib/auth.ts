 import NextAuth, { CredentialsSignin } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { clientIp, hitRateLimit, isRateLimited } from "@/lib/rateLimit";
import { hasAdminGate } from "@/lib/adminGate";

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
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        // "admin" from the hidden admin form on /login (see src/lib/adminGate.ts)
        portal: { label: "Portal", type: "text" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).trim();
        const password = String(credentials.password);
        const adminPortal = credentials.portal === "admin";
        const ip = clientIp(request);

        // The admin form only works after the access key opened it (signed, short-lived cookie), and failed admin
        // sign-ins are also limited per IP. Every refusal looks the same as a wrong password.
        if (adminPortal) {
          if (!hasAdminGate(request.headers.get("cookie"))) return null;
          const adminLimit = await isRateLimited("adminLogin", ip);
          if (!adminLimit.ok) throw new RateLimitedSignin(adminLimit.retryAfterSec);
        }

        // Only failed attempts count: 5 per email and 30 per IP; reaching the limit locks sign-in for 15 minutes
        const emailKey = email.toLowerCase();
        const [byEmail, byIp] = await Promise.all([isRateLimited("loginEmail", emailKey), isRateLimited("loginIp", ip)]);
        if (!byEmail.ok || !byIp.ok) throw new RateLimitedSignin(Math.max(byEmail.ok ? 0 : byEmail.retryAfterSec, byIp.ok ? 0 : byIp.retryAfterSec));

        await connectDB();
        const user = await User.findOne({ email });

        // The same work and the same answer whether the email is unknown or the password is wrong
        const isValid = await bcrypt.compare(password, user?.password || DUMMY_HASH);
        // On the admin form a correct password for a non-admin account is still a refusal
        if (!user || !user.password || !isValid || (adminPortal && user.role !== "ADMIN")) {
          if (adminPortal) {
            const a = await hitRateLimit("adminLogin", ip);
            if (a.remaining === 0) throw new RateLimitedSignin(a.retryAfterSec);
          }
          const [e, i] = await Promise.all([hitRateLimit("loginEmail", emailKey), hitRateLimit("loginIp", ip)]);
          // The failure that reaches the limit already locks, so the button locks straight away
          if (e.remaining === 0 || i.remaining === 0) throw new RateLimitedSignin(Math.max(e.remaining === 0 ? e.retryAfterSec : 0, i.remaining === 0 ? i.retryAfterSec : 0));
          return null;
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          adminPortal,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await connectDB();
        const existing = await User.findOne({ email: user.email });
        if (!existing) {
          await User.create({
            name: user.name,
            email: user.email,
            image: user.image,
            emailVerified: new Date(),
            // The sign-in page says continuing with Google means agreeing to the terms
            termsAcceptedAt: new Date(),
            role: "USER",
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        // Only a sign-in through the hidden admin form opens the admin panel (proxy.ts, requireAdminApi)
        token.adminPortal = user.adminPortal === true && user.role === "ADMIN";
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
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