export type AuditEventKind =
  | "login_success"
  | "login_failure"
  | "login_locked"
  | "logout"
  | "permission_denied"
  | "resident_created"
  | "resident_updated"
  | "resident_deleted"
  | "pdf_exported"
  | "staff_account_created"
  | "staff_account_updated"
  | "staff_account_disabled"
  | "password_reset_requested"
  | "password_reset_completed"
  | "facility_created"
  | "facility_updated";

export type AuditTargetType =
  | "resident"
  | "staff_account"
  | "facility"
  | "auth";

export type AuditMetadata = Record<string, string | number | boolean>;

export interface AuditEvent {
  readonly kind: AuditEventKind;
  readonly actorStaffAccountId: string | null;
  readonly targetType: AuditTargetType;
  readonly targetId: string | null;
  readonly ip: string | null;
  readonly metadata: AuditMetadata;
}

export interface ListAuditLogsParams {
  facilityIds: ReadonlyArray<string>;
  range: { from: Date; to: Date };
  kinds?: ReadonlyArray<AuditEventKind>;
  actorStaffAccountId?: string;
  targetId?: string;
  limit: number;
  cursor?: string;
}

export interface StoredAuditEvent {
  id: string;
  kind: AuditEventKind;
  actorStaffAccountId: string | null;
  targetType: AuditTargetType;
  targetId: string | null;
  ip: string | null;
  metadata: AuditMetadata;
  createdAt: Date;
}
