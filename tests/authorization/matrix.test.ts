import { describe, expect, it } from "vitest";

import {
  ALL_PERMISSIONS,
  isPermissionAllowed,
} from "@/shared/authorization/policy";
import type { Permission, Role } from "@/shared/authorization/types";

/**
 * authentication.md の Role Matrix と policy.ts の整合（タスク 16.3）。
 */
const MATRIX: Record<
  string,
  { permission: Permission; admin: boolean; staff: boolean; viewer: boolean }
> = {
  "利用者閲覧": {
    permission: "resident:read",
    admin: true,
    staff: true,
    viewer: true,
  },
  "利用者編集": {
    permission: "resident:update",
    admin: true,
    staff: true,
    viewer: false,
  },
  "利用者削除": {
    permission: "resident:delete",
    admin: true,
    staff: false,
    viewer: false,
  },
  "PDF 出力": {
    permission: "resident:pdf_export",
    admin: true,
    staff: true,
    viewer: false,
  },
  "保険編集": {
    permission: "insurance:update",
    admin: true,
    staff: true,
    viewer: false,
  },
  "総合保険状態変更": {
    permission: "comprehensive_insurance:update_status",
    admin: true,
    staff: true,
    viewer: false,
  },
  "期限アラート閲覧": {
    permission: "alert:read",
    admin: true,
    staff: true,
    viewer: true,
  },
  "期限アラート更新": {
    permission: "alert:update_status",
    admin: true,
    staff: true,
    viewer: false,
  },
  "職員管理": {
    permission: "staff_account:manage",
    admin: true,
    staff: false,
    viewer: false,
  },
  "他人パスワードリセット": {
    permission: "password:reset_others",
    admin: true,
    staff: false,
    viewer: false,
  },
  "施設管理": {
    permission: "facility:manage",
    admin: true,
    staff: false,
    viewer: false,
  },
  "監査ログ閲覧": {
    permission: "audit_log:read",
    admin: true,
    staff: false,
    viewer: false,
  },
};

describe("authorization matrix (task 16.3)", () => {
  it.each(Object.entries(MATRIX))(
    "%s matches authentication.md",
    (_label, row) => {
      const roles: Role[] = ["admin", "staff", "viewer"];
      for (const role of roles) {
        expect(isPermissionAllowed(role, row.permission)).toBe(row[role]);
      }
    },
  );

  it("covers every permission in policy", () => {
    const covered = new Set(
      Object.values(MATRIX).map((row) => row.permission),
    );
    for (const permission of ALL_PERMISSIONS) {
      expect(covered.has(permission)).toBe(true);
    }
  });
});

describe("facility scope enforcement helpers (task 16.3)", () => {
  it("denies cross-facility PDF export permission at policy level for viewer", () => {
    expect(isPermissionAllowed("viewer", "resident:pdf_export")).toBe(false);
  });
});
