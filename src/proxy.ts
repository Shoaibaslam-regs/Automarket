import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";

const protectedRoutes = ["/dashboard", "/sell", "/bookings", "/messages", "/profile", "/messages"];
const authRoutes = ["/login", "/register"];
const adminRoutes = ["/admin"];

export default auth((req: NextAuthRequest) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isAdmin = req.auth?.user?.role === "ADMIN";

  if (adminRoutes.some(r => pathname.startsWith(r))) {
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

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
