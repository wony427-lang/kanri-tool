import "server-only";

import { isPermissionAllowed } from "@/shared/authorization/policy";
import { prisma } from "@/shared/db/prisma";

import { ForbiddenError } from "./errors";
import { getAccessibleFacilityIds } from "./service";
import type { SessionContext } from "./types";

/** 利用者データ参照用: 有効な全施設 ID */
export async function getAllActiveFacilityIds(): Promise<ReadonlyArray<string>> {
  const facilities = await prisma.facility.findMany({
    where: { isActive: true },
    select: { id: true },
    orderBy: { name: "asc" },
  });
  return facilities.map((facility) => facility.id);
}

/**
 * 利用者の一覧・詳細・送信（PDF/添付等）用の施設スコープ。
 * 登録済み利用者は resident:read を持つ全従業員が参照できる。
 */
export async function resolveResidentFacilityScope(
  session: SessionContext,
  params: FacilityScopeParams = {},
): Promise<ReadonlyArray<string>> {
  if (!session.isActive || !isPermissionAllowed(session.role, "resident:read")) {
    return [];
  }

  const allIds = await getAllActiveFacilityIds();

  if (params.scope === "all") {
    if (session.role !== "admin") {
      throw new ForbiddenError();
    }
    return allIds;
  }

  if (params.facilityId) {
    if (!allIds.includes(params.facilityId)) {
      throw new ForbiddenError();
    }
    return [params.facilityId];
  }

  return allIds;
}

/**
 * ダッシュボード・アラート一覧など組織全体の集計用スコープ。
 * alert:read を持つ全従業員が同じ数字・一覧を参照できる。
 */
export async function resolveOrganizationFacilityScope(
  session: SessionContext,
  params: FacilityScopeParams = {},
): Promise<ReadonlyArray<string>> {
  if (!session.isActive || !isPermissionAllowed(session.role, "alert:read")) {
    return [];
  }

  const allIds = await getAllActiveFacilityIds();

  if (params.facilityId) {
    if (!allIds.includes(params.facilityId)) {
      throw new ForbiddenError();
    }
    return [params.facilityId];
  }

  return allIds;
}

export interface FacilityScopeParams {
  /** 特定施設 ID で絞り込み */
  facilityId?: string;
  /** admin のみ: 全 active 施設 */
  scope?: "all";
}

/**
 * 一覧・集計クエリ用の施設 ID リストを解決する（Req 15.2 / 15.3）。
 *
 * - パラメータなし → 所属施設（既定）
 * - scope=all → admin のみ、全 active 施設
 * - facilityId → admin は任意施設、staff/viewer は所属内のみ
 */
export async function resolveFacilityScope(
  session: SessionContext,
  params: FacilityScopeParams = {},
): Promise<ReadonlyArray<string>> {
  if (params.scope === "all") {
    if (session.role !== "admin") {
      throw new ForbiddenError();
    }

    const facilities = await prisma.facility.findMany({
      where: { isActive: true },
      select: { id: true },
      orderBy: { name: "asc" },
    });
    return facilities.map((facility) => facility.id);
  }

  if (params.facilityId) {
    if (session.role === "admin") {
      const facility = await prisma.facility.findFirst({
        where: { id: params.facilityId, isActive: true },
        select: { id: true },
      });
      if (!facility) {
        throw new ForbiddenError();
      }
      return [params.facilityId];
    }

    return getAccessibleFacilityIds(session, [params.facilityId]);
  }

  return getAccessibleFacilityIds(session);
}

export function parseFacilityScopeParams(
  raw: Record<string, string | string[] | undefined>,
): FacilityScopeParams {
  const scope = typeof raw.scope === "string" ? raw.scope : undefined;
  const facilityId =
    typeof raw.facilityId === "string" ? raw.facilityId : undefined;

  return {
    scope: scope === "all" ? "all" : undefined,
    facilityId,
  };
}
