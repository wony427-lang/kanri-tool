/**
 * 認可サービスの公開型。
 *
 * - 実装本体（`requirePermission` / `getAccessibleFacilityIds` 等）は
 *   task 4.2 が `src/shared/authorization/service.ts` に追加する。
 * - 本ファイルは task 1.5 時点で「テスト基盤の fake が安定的に参照する型」
 *   として前倒し配置する（design.md の Authorization Service 章と一致）。
 */

export type Role = "admin" | "staff" | "viewer";

export type Permission =
  | "resident:read"
  | "resident:update"
  | "resident:delete"
  | "resident:pdf_export"
  | "insurance:update"
  | "comprehensive_insurance:update_status"
  | "alert:read"
  | "alert:update_status"
  | "staff_account:manage"
  | "password:reset_others"
  | "facility:manage"
  | "audit_log:read";

export interface SessionContext {
  readonly userId: string;
  readonly staffAccountId: string;
  readonly role: Role;
  readonly facilityIds: ReadonlyArray<string>;
  readonly isActive: boolean;
}
