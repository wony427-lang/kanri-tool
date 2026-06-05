const PUBLIC_PATH_PREFIXES = ["/login", "/reset-password"] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isProtectedPath(pathname: string): boolean {
  if (isPublicPath(pathname)) {
    return false;
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/fonts")
  ) {
    return false;
  }

  if (pathname.startsWith("/api/")) {
    return true;
  }

  return (
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/residents") ||
    pathname.startsWith("/insurance-alerts") ||
    pathname.startsWith("/comprehensive-insurance") ||
    pathname.startsWith("/staff-accounts") ||
    pathname.startsWith("/facilities") ||
    pathname.startsWith("/audit-logs") ||
    pathname.startsWith("/dev")
  );
}

export function shouldRedirectUnauthenticated(
  pathname: string,
  isAuthenticated: boolean,
): boolean {
  return isProtectedPath(pathname) && !isAuthenticated;
}

export function shouldRedirectAuthenticatedFromAuthRoute(
  pathname: string,
  isAuthenticated: boolean,
): boolean {
  return isPublicPath(pathname) && isAuthenticated;
}
