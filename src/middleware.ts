import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
    console.log("MIDDLEWARE HIT:", req.nextUrl.pathname);
    const { pathname } = req.nextUrl;

  // Public routes
  const isPublic =
    pathname === "/auth" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public");

  if (isPublic) return NextResponse.next();

  // Protect app pages + APIs (except NextAuth)
  const isProtected =
    pathname === "/" ||
    pathname.startsWith("/lofts") ||
    pathname.startsWith("/birds") ||
    (pathname.startsWith("/api") && !pathname.startsWith("/api/auth"));

  if (!isProtected) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("next", pathname); // optional: return user after login
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/lofts/:path*", "/birds/:path*", "/"],
};
