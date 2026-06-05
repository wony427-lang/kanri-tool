import type { SessionContext } from "@/shared/authorization/types";

/**
 * SessionContext のテストファクトリ。
 *
 * - 既定は最小権限の `viewer` × 単一施設で、安全寄りに倒す
 *   （許可テストを書くときは override を明示する）。
 * - 部分上書き対応。`facilityIds` を上書きするときは全体を渡す。
 *
 * @example
 *   const adminSession = createFakeSession({
 *     role: "admin",
 *     facilityIds: ["facility-a", "facility-b"],
 *   });
 */
export function createFakeSession(
  overrides: Partial<SessionContext> = {},
): SessionContext {
  const base: SessionContext = {
    userId: "test-user-id",
    staffAccountId: "test-staff-account-id",
    role: "viewer",
    facilityIds: ["facility-a"],
    isActive: true,
  };
  return { ...base, ...overrides };
}
