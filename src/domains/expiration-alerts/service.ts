import "server-only";

import type { AlertHandleStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";

import type { SessionContext } from "@/shared/authorization/types";
import { ForbiddenError } from "@/shared/authorization/errors";
import { isPermissionAllowed } from "@/shared/authorization/policy";
import {
  resolveOrganizationFacilityScope,
  type FacilityScopeParams,
} from "@/shared/authorization/facility-scope";
import type { AlertBucket } from "@/shared/domain/date";
import { ValidationError } from "@/shared/domain/errors";
import { err, ok, type Result } from "@/shared/domain/result";
import { prisma } from "@/shared/db/prisma";

import type { ExpirationAlertItem, InsuranceAlertKind } from "./types";

function assertCanRead(session: SessionContext): void {
  if (!session.isActive || !isPermissionAllowed(session.role, "alert:read")) {
    throw new ForbiddenError();
  }
}

function assertCanUpdate(session: SessionContext): void {
  if (
    !session.isActive ||
    !isPermissionAllowed(session.role, "alert:update_status")
  ) {
    throw new ForbiddenError();
  }
}

interface AlertRow {
  alert_key: string;
  resident_id: string;
  resident_name: string;
  facility_id: string;
  facility_name: string;
  insurance_kind: string;
  end_date: Date;
  remaining_days: number;
  bucket: string;
  handle_status: AlertHandleStatus | null;
}

export async function listAlerts(
  session: SessionContext,
  params: {
    bucket?: AlertBucket;
    insuranceKind?: InsuranceAlertKind;
  } & FacilityScopeParams = {},
): Promise<ExpirationAlertItem[]> {
  assertCanRead(session);
  const { bucket, insuranceKind, ...scopeParams } = params;
  const facilityIds = await resolveOrganizationFacilityScope(session, scopeParams);
  if (facilityIds.length === 0) {
    return [];
  }

  const rows = await prisma.$queryRaw<AlertRow[]>(Prisma.sql`
    SELECT
      v.alert_key,
      v.resident_id,
      r.name AS resident_name,
      v.facility_id,
      f.name AS facility_name,
      v.insurance_kind,
      v.end_date,
      v.remaining_days,
      v.bucket,
      COALESCE(a.status, 'not_handled'::"AlertHandleStatus") AS handle_status
    FROM v_insurance_alerts v
    INNER JOIN residents r ON r.id = v.resident_id
    INNER JOIN facilities f ON f.id = v.facility_id
    LEFT JOIN alert_status_updates a ON a.alert_key = v.alert_key
    WHERE v.facility_id = ANY(${facilityIds}::uuid[])
      ${bucket ? Prisma.sql`AND v.bucket = ${bucket}` : Prisma.empty}
      ${
        insuranceKind
          ? Prisma.sql`AND v.insurance_kind = ${insuranceKind}`
          : Prisma.empty
      }
    ORDER BY v.remaining_days ASC, r.name ASC
  `);

  return rows.map((row) => ({
    id: row.alert_key,
    residentId: row.resident_id,
    residentName: row.resident_name,
    facilityId: row.facility_id,
    facilityName: row.facility_name,
    insuranceKind: row.insurance_kind as InsuranceAlertKind,
    endDate: row.end_date,
    remainingDays: Number(row.remaining_days),
    bucket: row.bucket as AlertBucket,
    handleStatus: row.handle_status ?? "not_handled",
  }));
}

const VALID_STATUSES: ReadonlyArray<AlertHandleStatus> = [
  "not_handled",
  "confirmed",
  "contacted",
  "renewed",
];

export async function updateAlertStatus(
  alertId: string,
  status: AlertHandleStatus,
  session: SessionContext,
): Promise<Result<void, ValidationError | ForbiddenError>> {
  assertCanUpdate(session);

  if (!VALID_STATUSES.includes(status)) {
    return err(
      new ValidationError("無効な対応状況です", {
        status: "無効な対応状況です",
      }),
    );
  }

  const [alert] = await prisma.$queryRaw<Array<{ facility_id: string }>>(
    Prisma.sql`
      SELECT facility_id
      FROM v_insurance_alerts
      WHERE alert_key = ${alertId}
      LIMIT 1
    `,
  );

  const facilityIds = await resolveOrganizationFacilityScope(session);
  if (!alert || !facilityIds.includes(alert.facility_id)) {
    throw new ForbiddenError();
  }

  await prisma.alertStatusUpdate.upsert({
    where: { alertKey: alertId },
    create: {
      alertKey: alertId,
      status,
      updatedBy: session.staffAccountId,
    },
    update: {
      status,
      updatedBy: session.staffAccountId,
    },
  });

  return ok(undefined);
}
