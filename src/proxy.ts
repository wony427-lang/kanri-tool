import { type NextRequest, NextResponse } from "next/server";

import { getCurrentClaims } from "@/shared/auth/get-claims";
import {
  isIdleSessionExpired,
  LAST_ACTIVITY_COOKIE,
  parseLastActivityCookie,
} from "@/shared/auth/idle-session";
import {
  shouldRedirectAuthenticatedFromAuthRoute,
  shouldRedirectUnauthenticated,
} from "@/shared/auth/route-guards";
import { getSessionIdleTimeoutMin } from "@/shared/config/env.middleware";
import { createSupabaseProxyClient } from "@/shared/supabase/proxy";

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("reason", "session_expired");
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(LAST_ACTIVITY_COOKIE);
  return response;
}

async function clearSupabaseSession(request: NextRequest): Promise<NextResponse> {
  const { supabase, response } = createSupabaseProxyClient(request);
  await supabase.auth.signOut();
  response.cookies.delete(LAST_ACTIVITY_COOKIE);
  return response;
}

function applyPrivateNoStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store, private");
  return response;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const { claims, response } = await getCurrentClaims(request);
  const isAuthenticated = Boolean(claims?.sub);

  if (isAuthenticated) {
    const lastActivity = parseLastActivityCookie(
      request.cookies.get(LAST_ACTIVITY_COOKIE)?.value,
    );
    const idleExpired = isIdleSessionExpired(
      lastActivity,
      Date.now(),
      getSessionIdleTimeoutMin(),
    );

    if (idleExpired) {
      const cleared = await clearSupabaseSession(request);
      if (shouldRedirectUnauthenticated(pathname, false)) {
        return redirectToLogin(request);
      }
      return cleared;
    }

    response.cookies.set(LAST_ACTIVITY_COOKIE, String(Date.now()), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    applyPrivateNoStore(response);
  }

  if (shouldRedirectUnauthenticated(pathname, isAuthenticated)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (shouldRedirectAuthenticatedFromAuthRoute(pathname, isAuthenticated)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
