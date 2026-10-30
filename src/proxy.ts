import { auth } from "@/lib/auth";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import type { NextAuthRequest } from "next-auth";
import { isCrossSiteWrite } from "@/lib/csrf";
import { findUnsafeKey } from "@/lib/nosql";

const protectedRoutes = ["/dashboard", "/sell", "/bookings", "/purchases", "/messages", "/profile", "/business", "/saved", "/notifications"];
const authRoutes = ["/login", "/register"];
const adminRoutes = ["/admin"];

const pageGuard = auth((req: NextAuthRequest) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  // The admin panel needs an ADMIN who signed in through the hidden admin form (requireAdminApi checks the same)
  const isAdmin = req.auth?.user?.role === "ADMIN" && req.auth.user.adminPortal === true;

  // "/admin" and "/admin/…" only
  if (adminRoutes.some(r => pathname === r || pathname.startsWith(`${r}/`))) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", req.url));
    if (!isAdmin) return NextResponse.redirect(new URL("/", req.url));
  }

  if (protectedRoutes.some(r => pathname.startsWith(r)) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (authRoutes.some(r => pathname.startsWith(r)) && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * True when a write's body is JSON carrying a MongoDB operator ($ne, $gt, $where…) or a prototype key
 * (src/lib/nosql.ts). Routes call req.json() whatever the Content-Type says, so every body that parses as JSON
 * is checked. Next buffers the body for the proxy, so the route can still read it. UploadThing checks its own
 * signed requests and is skipped; form posts (NextAuth sign-in, Pusher auth) only carry strings.
 */
async function hasOperatorBody(req: NextRequest): Promise<boolean> {
  if (!WRITE_METHODS.has(req.method) || req.nextUrl.pathname.startsWith("/api/uploadthing")) return false;
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("multipart/form-data") || type.includes("application/x-www-form-urlencoded")) return false;
  let text: string;
  try {
    text = await req.clone().text();
  } catch {
    return false;
  }
  const start = text.trimStart()[0];
  if (start !== "{" && start !== "[") return false;
  try {
    return findUnsafeKey(JSON.parse(text)) !== null;
  } catch {
    return false; // not JSON: the route's own req.json() refuses it
  }
}

export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  // API routes check the session themselves; here they only get the CSRF check: a request that changes data
  // (POST, PUT, PATCH, DELETE) must come from this site. The session cookie is SameSite=Lax, which already stops
  // most cross-site posts; this also covers browsers and cases Lax doesn't (src/lib/csrf.ts).
  if (req.nextUrl.pathname.startsWith("/api/")) {
    if (isCrossSiteWrite(req.method, req.headers)) {
      return NextResponse.json({ error: "This request must come from AutoGO itself." }, { status: 403 });
    }
    // NoSQL injection: { "password": { "$ne": null } } would turn a value into a query operator
    if (await hasOperatorBody(req)) {
      return NextResponse.json({ error: "Invalid request.", code: "INVALID_INPUT" }, { status: 400 });
    }
    return NextResponse.next();
  }
  return (pageGuard as unknown as (r: NextRequest, e: NextFetchEvent) => ReturnType<typeof NextResponse.next>)(req, event);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
