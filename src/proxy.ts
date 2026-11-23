import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic check only: sends visitors without a session cookie to /login.
 * The real check (valid, unexpired session; role) happens on the server in
 * every page, action and API route.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("mag_session")) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except the login page, the signed render pages headless Chromium opens,
  // API routes (they check the session themselves), uploads and Next.js assets.
  matcher: ["/((?!login|render|api|uploads|_next|favicon.ico).*)"],
};
