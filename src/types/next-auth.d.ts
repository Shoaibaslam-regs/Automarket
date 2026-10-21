import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      /** An ADMIN who signed in through the hidden admin form on /login (src/lib/adminGate.ts); needed for the admin panel */
      adminPortal?: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role?: string;
    adminPortal?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: string;
    /** This sign-in came through the hidden admin form */
    adminPortal?: boolean;
  }
}