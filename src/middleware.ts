import { NextRequest, NextResponse } from "next/server";
import { getIronSession, SessionOptions } from "iron-session";

interface SessionData {
  isLoggedIn: boolean;
}

const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET || "complex_password_at_least_32_characters_long",
  cookieName: "mydoc_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

const publicPaths = ["/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check authentication
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(
    request,
    response,
    sessionOptions
  );

  if (!session.isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
