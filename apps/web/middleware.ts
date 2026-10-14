/**
 * Next.js middleware for authentication-aware routing.
 *
 * Protected routes (anything under /dashboard or /onboarding) redirect to
 * /login when there is no active Better Auth session cookie.
 *
 * Auth routes (/login, /signup) redirect to /dashboard when the user already
 * has a session, so they are not shown a login screen they do not need.
 *
 * The middleware reads the session by calling the Better Auth session endpoint
 * on the API. The API_URL comes from the NEXT_PUBLIC_API_URL env variable so
 * no secret is embedded in this file.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const PUBLIC_PATHS = ["/login", "/signup"];

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

async function getSession(request: NextRequest): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/get-session`, {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      // Do not cache the session check.
      next: { revalidate: 0 },
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { user?: unknown } | null;
    return Boolean(data?.user);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through static assets, Next.js internals, and the auth API proxy.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const hasSession = await getSession(request);

  // Redirect authenticated users away from auth pages.
  if (hasSession && isPublicPath(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users away from protected pages.
  if (!hasSession && isProtectedPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    const next = `${pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on every route except the explicitly excluded prefixes above.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
