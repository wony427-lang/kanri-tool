import "server-only";

import { requireAdminOnly } from "@/shared/authorization/service";
import { listAuditLogs } from "@/shared/audit-log";
import type { AuditEventKind } from "@/shared/audit-log/types";

const AUDIT_KIND_LABELS: Record<AuditEventKind, string> = {
  login_success: "ログイン成功",
  login_failure: "ログイン失敗",
  login_locked: "ログインロック",
  logout: "ログアウト",
  permission_denied: "権限拒否",
  resident_created: "利用者作成",
  resident_updated: "利用者更新",
  resident_deleted: "利用者削除",
  pdf_exported: "PDF 出力",
  staff_account_created: "職員作成",
  staff_account_updated: "職員更新",
  staff_account_disabled: "職員停止",
  password_reset_requested: "パスワードリセット要求",
  password_reset_completed: "パスワードリセット完了",
  facility_created: "施設作成",
  facility_updated: "施設更新",
};

export { AUDIT_KIND_LABELS };

export async function listAuditLogsForAdmin(params: {
  from: string;
  to: string;
  kind?: AuditEventKind;
  actorStaffAccountId?: string;
  targetId?: string;
  cursor?: string;
}) {
  await requireAdminOnly();

  const from = new Date(params.from);
  const to = new Date(params.to);
  to.setHours(23, 59, 59, 999);

  return listAuditLogs({
    facilityIds: [],
    range: { from, to },
    kinds: params.kind ? [params.kind] : undefined,
    actorStaffAccountId: params.actorStaffAccountId,
    targetId: params.targetId,
    limit: 50,
    cursor: params.cursor,
  });
}
