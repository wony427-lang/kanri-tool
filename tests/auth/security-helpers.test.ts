import { describe, expect, it } from "vitest";

import {
  countRecentFailedAttempts,
  isLoginLocked,
  remainingLockMinutes,
  validatePasswordStrength,
} from "@/domains/auth/password-policy";
import {
  isIdleSessionExpired,
  parseLastActivityCookie,
} from "@/shared/auth/idle-session";
import {
  isProtectedPath,
  shouldRedirectUnauthenticated,
} from "@/shared/auth/route-guards";

describe("login lockout (task 4.4)", () => {
  const now = new Date("2026-05-24T12:00:00Z");

  it("counts failed attempts within the lock window", () => {
    const attempts = [
      { succeeded: false, attemptedAt: new Date("2026-05-24T11:50:00Z") },
      { succeeded: true, attemptedAt: new Date("2026-05-24T11:55:00Z") },
      { succeeded: false, attemptedAt: new Date("2026-05-24T11:40:00Z") },
    ];

    expect(countRecentFailedAttempts(attempts, now, 15)).toBe(1);
  });

  it("locks at the configured threshold", () => {
    expect(isLoginLocked(4, 5)).toBe(false);
    expect(isLoginLocked(5, 5)).toBe(true);
  });

  it("calculates remaining lock minutes", () => {
    expect(
      remainingLockMinutes(new Date("2026-05-24T11:50:00Z"), now, 15),
    ).toBe(5);
  });
});

describe("password policy (task 4.6)", () => {
  it("accepts 8-character passwords", () => {
    expect(validatePasswordStrength("Abcd1234")).toBe(true);
  });

  it("rejects non-8-character passwords", () => {
    expect(validatePasswordStrength("short1")).toBe(false);
    expect(validatePasswordStrength("alllowercase123")).toBe(false);
  });
});

describe("idle session (task 4.5)", () => {
  it("expires sessions after the idle timeout", () => {
    const lastActivity = Date.now() - 31 * 60 * 1000;
    expect(isIdleSessionExpired(lastActivity, Date.now(), 30)).toBe(true);
  });

  it("parses last activity cookie values", () => {
    expect(parseLastActivityCookie("123")).toBe(123);
    expect(parseLastActivityCookie(undefined)).toBeNull();
  });
});

describe("route guards (task 4.1, 16.2)", () => {
  it("protects dashboard and API routes", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/api/residents/x/pdf")).toBe(true);
    expect(isProtectedPath("/")).toBe(true);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/fonts/NotoSansJP-Regular.ttf")).toBe(false);
  });

  it("redirects unauthenticated users from protected routes", () => {
    expect(shouldRedirectUnauthenticated("/dashboard", false)).toBe(true);
    expect(shouldRedirectUnauthenticated("/api/residents/x/pdf", false)).toBe(true);
    expect(shouldRedirectUnauthenticated("/", false)).toBe(true);
    expect(shouldRedirectUnauthenticated("/login", false)).toBe(false);
  });
});
