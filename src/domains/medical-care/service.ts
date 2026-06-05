import "server-only";

import type { SessionContext } from "@/shared/authorization/types";
import { ForbiddenError } from "@/shared/authorization/errors";
import { isPermissionAllowed } from "@/shared/authorization/policy";
import { NotFoundError, ValidationError } from "@/shared/domain/errors";
import { err, ok, type Result } from "@/shared/domain/result";
import { prisma } from "@/shared/db/prisma";

import { findResidentForSession } from "@/domains/residents/service";
import {
  emergencyContactsSchema,
  medicalCareInfoSchema,
  medicalHistorySchema,
  zodFieldErrors,
} from "./schemas";
import type {
  EmergencyContactsInput,
  MedicalCareInfoInput,
  MedicalHistoryInput,
} from "./schemas";

function assertCanUpdate(session: SessionContext): void {
  if (!session.isActive || !isPermissionAllowed(session.role, "resident:update")) {
    throw new ForbiddenError();
  }
}

async function assertResidentInScope(
  residentId: string,
  session: SessionContext,
): Promise<Result<void, NotFoundError>> {
  const resident = await findResidentForSession(residentId, session);
  if (!resident) {
    return err(new NotFoundError("利用者が見つかりません"));
  }
  return ok(undefined);
}

export async function upsertMedicalCareInfo(
  residentId: string,
  input: MedicalCareInfoInput,
  session: SessionContext,
): Promise<Result<void, ValidationError | NotFoundError | ForbiddenError>> {
  assertCanUpdate(session);

  const scope = await assertResidentInScope(residentId, session);
  if (!scope.ok) {
    return scope;
  }

  const parsed = medicalCareInfoSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      new ValidationError("入力内容に誤りがあります", zodFieldErrors(parsed.error)),
    );
  }

  await prisma.medicalCareInfo.upsert({
    where: { residentId },
    create: {
      residentId,
      ...parsed.data,
      createdBy: session.staffAccountId,
      updatedBy: session.staffAccountId,
    },
    update: {
      ...parsed.data,
      updatedBy: session.staffAccountId,
    },
  });

  return ok(undefined);
}

export async function upsertEmergencyContacts(
  residentId: string,
  input: EmergencyContactsInput,
  session: SessionContext,
): Promise<
  Result<{ warnings: string[] }, ValidationError | NotFoundError | ForbiddenError>
> {
  assertCanUpdate(session);

  const scope = await assertResidentInScope(residentId, session);
  if (!scope.ok) {
    return scope;
  }

  const parsed = emergencyContactsSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      new ValidationError("入力内容に誤りがあります", zodFieldErrors(parsed.error)),
    );
  }

  const contact1 = parsed.data.contact1;
  const contact2 = parsed.data.contact2;
  const warnings: string[] = [];

  const contact1Empty =
    !contact1?.name?.trim() &&
    !contact1?.phone?.trim() &&
    !contact1?.mobile?.trim();

  const contact2Present =
    !!contact2?.name?.trim() ||
    !!contact2?.phone?.trim() ||
    !!contact2?.mobile?.trim();

  if (contact2Present && contact1Empty) {
    return err(
      new ValidationError("緊急連絡先 1 を空にできません", {
        contact1Name: "緊急連絡先 1 を空にできません",
      }),
    );
  }

  if (
    contact1 &&
    !contact1Empty &&
    !contact1.phone?.trim() &&
    !contact1.mobile?.trim()
  ) {
    warnings.push("緊急連絡先 1 の電話番号・携帯番号が未入力です");
  }

  await prisma.$transaction(async (tx) => {
    await tx.emergencyContact.deleteMany({ where: { residentId } });

    const toCreate = [];
    if (contact1 && !contact1Empty) {
      toCreate.push({
        residentId,
        sortOrder: 1,
        name: (contact1.name ?? "").trim(),
        relationship: contact1.relationship?.trim() || null,
        address: contact1.address?.trim() || null,
        phone: contact1.phone?.trim() || null,
        mobile: contact1.mobile?.trim() || null,
        createdBy: session.staffAccountId,
        updatedBy: session.staffAccountId,
      });
    }
    if (contact2 && contact2Present && contact2.name?.trim()) {
      toCreate.push({
        residentId,
        sortOrder: 2,
        name: contact2.name.trim(),
        relationship: contact2.relationship?.trim() || null,
        address: contact2.address?.trim() || null,
        phone: contact2.phone?.trim() || null,
        mobile: contact2.mobile?.trim() || null,
        createdBy: session.staffAccountId,
        updatedBy: session.staffAccountId,
      });
    }

    if (toCreate.length > 0) {
      await tx.emergencyContact.createMany({ data: toCreate });
    }
  });

  return ok({ warnings });
}

export async function upsertMedicalHistory(
  residentId: string,
  input: MedicalHistoryInput,
  session: SessionContext,
): Promise<Result<void, ValidationError | NotFoundError | ForbiddenError>> {
  assertCanUpdate(session);

  const scope = await assertResidentInScope(residentId, session);
  if (!scope.ok) {
    return scope;
  }

  const parsed = medicalHistorySchema.safeParse(input);
  if (!parsed.success) {
    return err(
      new ValidationError("入力内容に誤りがあります", zodFieldErrors(parsed.error)),
    );
  }

  await prisma.resident.update({
    where: { id: residentId },
    data: {
      medicalHistory: parsed.data.medicalHistory?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      updatedBy: session.staffAccountId,
    },
  });

  return ok(undefined);
}
