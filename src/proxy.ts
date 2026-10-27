import { auth } from "@/lib/auth";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import type { NextAuthRequest } from "next-auth";
import { isCrossSiteWrite } from "@/lib/csrf";

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

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  // API routes check the session themselves; here they only get the CSRF check: a request that changes data
  // (POST, PUT, PATCH, DELETE) must come from this site. The session cookie is SameSite=Lax, which already stops
  // most cross-site posts; this also covers browsers and cases Lax doesn't (src/lib/csrf.ts).
  if (req.nextUrl.pathname.startsWith("/api/")) {
    if (isCrossSiteWrite(req.method, req.headers)) {
      return NextResponse.json({ error: "This request must come from AutoGO itself." }, { status: 403 });
    }
    return NextResponse.next();
  }
  return (pageGuard as unknown as (r: NextRequest, e: NextFetchEvent) => ReturnType<typeof NextResponse.next>)(req, event);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
