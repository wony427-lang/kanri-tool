import "server-only";

import { Prisma } from "@prisma/client";

import type { SessionContext } from "@/shared/authorization/types";
import { ForbiddenError } from "@/shared/authorization/errors";
import { isPermissionAllowed } from "@/shared/authorization/policy";
import {
  resolveOrganizationFacilityScope,
  type FacilityScopeParams,
} from "@/shared/authorization/facility-scope";
import { prisma } from "@/shared/db/prisma";

import type { DashboardSummary } from "./types";

function assertCanRead(session: SessionContext): void {
  if (!session.isActive || !isPermissionAllowed(session.role, "alert:read")) {
    throw new ForbiddenError();
  }
}

export async function getDashboardSummary(
  session: SessionContext,
  params: FacilityScopeParams = {},
): Promise<DashboardSummary> {
  assertCanRead(session);
  const facilityIds = await resolveOrganizationFacilityScope(session, params);
  if (facilityIds.length === 0) {
    return {
      residentTotal: 0,
      residentsByFacility: [],
      expiredAlertCount: 0,
      upcomingAlertCount: 0,
      unbilledComprehensiveCount: 0,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    residentTotal,
    residentsByFacility,
    expiredRows,
    upcomingRows,
    unbilledComprehensiveCount,
  ] = await Promise.all([
    prisma.resident.count({
      where: { facilityId: { in: [...facilityIds] } },
    }),
    prisma.resident.groupBy({
      by: ["facilityId"],
      where: { facilityId: { in: [...facilityIds] } },
      _count: { _all: true },
    }),
    prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM v_insurance_alerts v
      LEFT JOIN alert_status_updates a ON a.alert_key = v.alert_key
      WHERE v.facility_id = ANY(${facilityIds}::uuid[])
        AND v.bucket = 'expired'
        AND COALESCE(a.status, 'not_handled'::"AlertHandleStatus") = 'not_handled'
    `),
    prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM v_insurance_alerts v
      LEFT JOIN alert_status_updates a ON a.alert_key = v.alert_key
      WHERE v.facility_id = ANY(${facilityIds}::uuid[])
        AND v.bucket = 'within_30'
        AND COALESCE(a.status, 'not_handled'::"AlertHandleStatus") = 'not_handled'
    `),
    prisma.comprehensiveInsuranceRecord.count({
      where: {
        enrolled: true,
        billingStatus: "unbilled",
        nextBillingDate: { lte: today },
        resident: { facilityId: { in: [...facilityIds] } },
      },
    }),
  ]);

  const facilityNameMap = new Map(
    (
      await prisma.facility.findMany({
        where: { id: { in: [...facilityIds] } },
        select: { id: true, name: true },
      })
    ).map((facility) => [facility.id, facility.name]),
  );

  return {
    residentTotal,
    residentsByFacility: residentsByFacility
      .map((row) => ({
        facilityId: row.facilityId,
        facilityName: facilityNameMap.get(row.facilityId) ?? row.facilityId,
        count: row._count._all,
      }))
      .sort((left, right) => left.facilityName.localeCompare(right.facilityName, "ja")),
    expiredAlertCount: Number(expiredRows[0]?.count ?? BigInt(0)),
    upcomingAlertCount: Number(upcomingRows[0]?.count ?? BigInt(0)),
    unbilledComprehensiveCount,
  };
}
