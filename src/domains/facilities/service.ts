import "server-only";

import type { SessionContext } from "@/shared/authorization/types";
import { ForbiddenError } from "@/shared/authorization/errors";
import { isPermissionAllowed } from "@/shared/authorization/policy";
import { NotFoundError } from "@/shared/domain/errors";
import { err, ok, type Result } from "@/shared/domain/result";
import { prisma } from "@/shared/db/prisma";

import { facilityRepository } from "./repository";
import {
  createFacilitySchema,
  updateFacilitySchema,
  zodFieldErrors,
} from "./schemas";
import type {
  CreateFacilityInput,
  FacilitySummary,
  UpdateFacilityInput,
} from "./types";
import { ValidationError } from "@/shared/domain/errors";

function assertFacilityManage(session: SessionContext): void {
  if (!session.isActive || !isPermissionAllowed(session.role, "facility:manage")) {
    throw new ForbiddenError();
  }
}

export async function listFacilities(
  session: SessionContext,
): Promise<FacilitySummary[]> {
  assertFacilityManage(session);
  return facilityRepository.list();
}

export async function getFacilityById(
  id: string,
  session: SessionContext,
): Promise<Result<FacilitySummary, NotFoundError | ForbiddenError>> {
  assertFacilityManage(session);
  const facility = await facilityRepository.findById(id);
  if (!facility) {
    return err(new NotFoundError("施設が見つかりません"));
  }
  return ok(facility);
}

export async function createFacility(
  input: CreateFacilityInput,
  session: SessionContext,
  ip: string | null,
): Promise<Result<FacilitySummary, ValidationError | ForbiddenError>> {
  assertFacilityManage(session);

  const parsed = createFacilitySchema.safeParse(input);
  if (!parsed.success) {
    return err(new ValidationError("入力内容に誤りがあります", zodFieldErrors(parsed.error)));
  }

  const facility = await prisma.$transaction(async (tx) => {
    const created = await tx.facility.create({
      data: {
        name: parsed.data.name,
        createdBy: session.staffAccountId,
        updatedBy: session.staffAccountId,
      },
    });

    await tx.auditLog.create({
      data: {
        kind: "facility_created",
        actorStaffAccountId: session.staffAccountId,
        targetType: "facility",
        targetId: created.id,
        ip: ip ?? undefined,
        metadata: { name: created.name },
      },
    });

    return created;
  });

  return ok({
    id: facility.id,
    name: facility.name,
    isActive: facility.isActive,
    createdAt: facility.createdAt,
    updatedAt: facility.updatedAt,
  });
}

export async function updateFacility(
  id: string,
  input: UpdateFacilityInput,
  session: SessionContext,
  ip: string | null,
): Promise<
  Result<FacilitySummary, ValidationError | NotFoundError | ForbiddenError>
> {
  assertFacilityManage(session);

  const parsed = updateFacilitySchema.safeParse(input);
  if (!parsed.success) {
    return err(new ValidationError("入力内容に誤りがあります", zodFieldErrors(parsed.error)));
  }

  const existing = await facilityRepository.findById(id);
  if (!existing) {
    return err(new NotFoundError("施設が見つかりません"));
  }

  const facility = await prisma.$transaction(async (tx) => {
    const updated = await tx.facility.update({
      where: { id },
      data: {
        name: parsed.data.name,
        isActive: parsed.data.isActive,
        updatedBy: session.staffAccountId,
      },
    });

    await tx.auditLog.create({
      data: {
        kind: "facility_updated",
        actorStaffAccountId: session.staffAccountId,
        targetType: "facility",
        targetId: updated.id,
        ip: ip ?? undefined,
        metadata: {
          name: updated.name,
          isActive: updated.isActive,
        },
      },
    });

    return updated;
  });

  return ok({
    id: facility.id,
    name: facility.name,
    isActive: facility.isActive,
    createdAt: facility.createdAt,
    updatedAt: facility.updatedAt,
  });
}
