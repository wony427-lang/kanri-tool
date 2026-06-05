import "server-only";

import type { SessionContext } from "@/shared/authorization/types";
import { ForbiddenError } from "@/shared/authorization/errors";
import {
  getAllActiveFacilityIds,
  resolveResidentFacilityScope,
  type FacilityScopeParams,
} from "@/shared/authorization/facility-scope";
import { isPermissionAllowed } from "@/shared/authorization/policy";
import { NotFoundError, ValidationError } from "@/shared/domain/errors";
import { err, ok, type Result } from "@/shared/domain/result";
import { prisma } from "@/shared/db/prisma";

import { residentRepository } from "./repository";
import {
  normalizeMoveOutDate,
  residentFormSchema,
  validateMoveOutDateConsistency,
  zodFieldErrors,
} from "./schemas";
import type {
  CreateResidentInput,
  ResidentDetail,
  ResidentListItem,
  ResidentSearchQuery,
  UpdateResidentInput,
} from "./types";
import { parseOptionalDate } from "./schemas";

function assertCanRead(session: SessionContext): void {
  if (!session.isActive || !isPermissionAllowed(session.role, "resident:read")) {
    throw new ForbiddenError();
  }
}

function assertCanUpdate(session: SessionContext): void {
  if (!session.isActive || !isPermissionAllowed(session.role, "resident:update")) {
    throw new ForbiddenError();
  }
}

function assertCanDelete(session: SessionContext): void {
  if (!session.isActive || !isPermissionAllowed(session.role, "resident:delete")) {
    throw new ForbiddenError();
  }
}

/** 登録済み利用者は resident:read を持つ全従業員が参照可能 */
export async function findResidentForSession(
  id: string,
  session: SessionContext,
): Promise<ResidentDetail | null> {
  assertCanRead(session);
  return residentRepository.findByIdUnscoped(id);
}

function parseResidentInput(input: CreateResidentInput) {
  const parsed = residentFormSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      new ValidationError("入力内容に誤りがあります", zodFieldErrors(parsed.error)),
    );
  }

  const birthDate = parseOptionalDate(parsed.data.birthDate);
  if (!birthDate) {
    return err(
      new ValidationError("入力内容に誤りがあります", {
        birthDate: "生年月日が不正です",
      }),
    );
  }

  const moveOutDate = normalizeMoveOutDate({
    usageStatus: parsed.data.usageStatus,
    moveOutDate: parseOptionalDate(parsed.data.moveOutDate),
  });

  const consistencyErrors = validateMoveOutDateConsistency({
    usageStatus: parsed.data.usageStatus,
    moveOutDate,
  });

  if (Object.keys(consistencyErrors).length > 0) {
    return err(
      new ValidationError("入力内容に誤りがあります", consistencyErrors),
    );
  }

  return ok({
    facilityId: parsed.data.facilityId,
    name: parsed.data.name,
    nameKana: parsed.data.nameKana,
    birthDate,
    gender: parsed.data.gender,
    address: parsed.data.address?.trim() || null,
    phone: parsed.data.phone?.trim() || null,
    mobile: parsed.data.mobile?.trim() || null,
    moveInDate: parseOptionalDate(parsed.data.moveInDate),
    moveOutDate,
    usageStatus: parsed.data.usageStatus,
  });
}

export async function searchResidents(
  query: ResidentSearchQuery,
  session: SessionContext,
  scopeParams: FacilityScopeParams = {},
): Promise<{ items: ResidentListItem[]; total: number }> {
  assertCanRead(session);
  let facilityIds = await resolveResidentFacilityScope(session, scopeParams);

  if (query.facilityId) {
    if (!facilityIds.includes(query.facilityId)) {
      return { items: [], total: 0 };
    }
    facilityIds = [query.facilityId];
  }

  if (facilityIds.length === 0) {
    return { items: [], total: 0 };
  }

  return residentRepository.search({
    facilityIds,
    keyword: query.keyword,
    careLevel: query.careLevel,
    facilityId: query.facilityId,
    primaryDoctor: query.primaryDoctor,
    careManagerKeyword: query.careManagerKeyword,
    usageStatus: query.usageStatus,
    pagination: query.pagination,
    sort: query.sort,
  });
}

export async function getResidentById(
  id: string,
  session: SessionContext,
): Promise<Result<ResidentDetail, NotFoundError | ForbiddenError>> {
  assertCanRead(session);

  const resident = await findResidentForSession(id, session);
  if (!resident) {
    return err(new NotFoundError("利用者が見つかりません"));
  }
  return ok(resident);
}

export async function createResident(
  input: CreateResidentInput,
  session: SessionContext,
  ip: string | null,
): Promise<Result<ResidentDetail, ValidationError | ForbiddenError>> {
  assertCanUpdate(session);

  const parsed = parseResidentInput(input);
  if (!parsed.ok) {
    return parsed;
  }

  const activeFacilityIds = await getAllActiveFacilityIds();
  if (!activeFacilityIds.includes(parsed.value.facilityId)) {
    throw new ForbiddenError();
  }

  const resident = await prisma.$transaction(async (tx) => {
    const created = await tx.resident.create({
      data: {
        ...parsed.value,
        createdBy: session.staffAccountId,
        updatedBy: session.staffAccountId,
      },
      include: {
        facility: { select: { name: true } },
        medicalCareInfo: true,
        emergencyContacts: true,
        careInsurance: { select: { careLevel: true } },
      },
    });

    await tx.auditLog.create({
      data: {
        kind: "resident_created",
        actorStaffAccountId: session.staffAccountId,
        targetType: "resident",
        targetId: created.id,
        ip: ip ?? undefined,
        metadata: { facilityId: created.facilityId },
      },
    });

    return created;
  });

  const detail = await findResidentForSession(resident.id, session);
  return ok(detail!);
}

export async function updateResident(
  id: string,
  input: UpdateResidentInput,
  session: SessionContext,
  ip: string | null,
): Promise<
  Result<ResidentDetail, ValidationError | NotFoundError | ForbiddenError>
> {
  assertCanUpdate(session);

  const parsed = parseResidentInput(input);
  if (!parsed.ok) {
    return parsed;
  }

  const existing = await findResidentForSession(id, session);
  if (!existing) {
    return err(new NotFoundError("利用者が見つかりません"));
  }

  const activeFacilityIds = await getAllActiveFacilityIds();
  if (!activeFacilityIds.includes(parsed.value.facilityId)) {
    throw new ForbiddenError();
  }

  await prisma.$transaction(async (tx) => {
    await tx.resident.update({
      where: { id },
      data: {
        ...parsed.value,
        updatedBy: session.staffAccountId,
      },
    });

    await tx.auditLog.create({
      data: {
        kind: "resident_updated",
        actorStaffAccountId: session.staffAccountId,
        targetType: "resident",
        targetId: id,
        ip: ip ?? undefined,
        metadata: { facilityId: parsed.value.facilityId },
      },
    });
  });

  const detail = await findResidentForSession(id, session);
  return ok(detail!);
}

export async function deleteResident(
  id: string,
  session: SessionContext,
  ip: string | null,
): Promise<Result<void, NotFoundError | ForbiddenError>> {
  assertCanDelete(session);

  const existing = await findResidentForSession(id, session);
  if (!existing) {
    return err(new NotFoundError("利用者が見つかりません"));
  }

  await prisma.$transaction(async (tx) => {
    await tx.resident.delete({ where: { id } });

    await tx.auditLog.create({
      data: {
        kind: "resident_deleted",
        actorStaffAccountId: session.staffAccountId,
        targetType: "resident",
        targetId: id,
        ip: ip ?? undefined,
        metadata: { facilityId: existing.facilityId },
      },
    });
  });

  return ok(undefined);
}

export function canManageResidents(session: SessionContext): boolean {
  return (
    session.isActive && isPermissionAllowed(session.role, "resident:update")
  );
}

export function canDeleteResidents(session: SessionContext): boolean {
  return (
    session.isActive && isPermissionAllowed(session.role, "resident:delete")
  );
}
