import "server-only";

import type { CareLevel } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { parseOptionalDateInput, validatePeriod } from "@/shared/domain/date";
import type { SessionContext } from "@/shared/authorization/types";
import { ForbiddenError } from "@/shared/authorization/errors";
import { isPermissionAllowed } from "@/shared/authorization/policy";
import { NotFoundError, ValidationError } from "@/shared/domain/errors";
import { err, ok, type Result } from "@/shared/domain/result";
import { prisma } from "@/shared/db/prisma";

import { findResidentForSession } from "@/domains/residents/service";

import {
  careInsuranceSchema,
  disabilityWelfareSchema,
  medicalInsuranceSchema,
  normalizeOptionalString,
  publicExpenseSchema,
  zodFieldErrors,
} from "./schemas";
import type {
  CareInsuranceDetail,
  DisabilityWelfareDetail,
  MedicalInsuranceDetail,
  PublicExpenseDetail,
} from "./types";

function assertInsuranceUpdate(session: SessionContext): void {
  if (!session.isActive || !isPermissionAllowed(session.role, "insurance:update")) {
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

function parseCareLevel(value: string | undefined): CareLevel | null {
  if (!value?.trim()) {
    return null;
  }
  return value as CareLevel;
}

function parseBurdenRatio(value: number | null): number | null {
  if (value === null) {
    return null;
  }
  if (![1, 2, 3].includes(value)) {
    return null;
  }
  return value;
}

export async function getCareInsurance(
  residentId: string,
  session: SessionContext,
): Promise<CareInsuranceDetail | null> {
  const scope = await assertResidentInScope(residentId, session);
  if (!scope.ok) {
    return null;
  }
  const row = await prisma.careInsurance.findUnique({ where: { residentId } });
  if (!row) {
    return null;
  }
  return {
    residentId: row.residentId,
    insurerNo: row.insurerNo,
    insuredNo: row.insuredNo,
    careLevel: row.careLevel,
    certificationDate: row.certificationDate,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    burdenRatio: row.burdenRatio,
    burdenRatioExpiresAt: row.burdenRatioExpiresAt,
  };
}

export async function upsertCareInsurance(
  residentId: string,
  input: unknown,
  session: SessionContext,
): Promise<Result<CareInsuranceDetail, ValidationError | NotFoundError | ForbiddenError>> {
  assertInsuranceUpdate(session);
  const scope = await assertResidentInScope(residentId, session);
  if (!scope.ok) {
    return scope;
  }

  const parsed = careInsuranceSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      new ValidationError("入力内容に誤りがあります", zodFieldErrors(parsed.error)),
    );
  }

  const periodStart = parseOptionalDateInput(parsed.data.periodStart);
  const periodEnd = parseOptionalDateInput(parsed.data.periodEnd);
  const periodErrors = validatePeriod(periodStart, periodEnd);
  if (Object.keys(periodErrors).length > 0) {
    return err(new ValidationError("入力内容に誤りがあります", periodErrors));
  }

  const burdenRatio = parseBurdenRatio(parsed.data.burdenRatio ?? null);
  if (parsed.data.burdenRatio != null && burdenRatio === null) {
    return err(
      new ValidationError("入力内容に誤りがあります", {
        burdenRatio: "負担割合は1・2・3のいずれかを選択してください",
      }),
    );
  }

  const row = await prisma.careInsurance.upsert({
    where: { residentId },
    create: {
      residentId,
      insurerNo: normalizeOptionalString(parsed.data.insurerNo),
      insuredNo: normalizeOptionalString(parsed.data.insuredNo),
      careLevel: parseCareLevel(parsed.data.careLevel),
      certificationDate: parseOptionalDateInput(parsed.data.certificationDate),
      periodStart,
      periodEnd,
      burdenRatio,
      burdenRatioExpiresAt: parseOptionalDateInput(
        parsed.data.burdenRatioExpiresAt,
      ),
      createdBy: session.staffAccountId,
      updatedBy: session.staffAccountId,
    },
    update: {
      insurerNo: normalizeOptionalString(parsed.data.insurerNo),
      insuredNo: normalizeOptionalString(parsed.data.insuredNo),
      careLevel: parseCareLevel(parsed.data.careLevel),
      certificationDate: parseOptionalDateInput(parsed.data.certificationDate),
      periodStart,
      periodEnd,
      burdenRatio,
      burdenRatioExpiresAt: parseOptionalDateInput(
        parsed.data.burdenRatioExpiresAt,
      ),
      updatedBy: session.staffAccountId,
    },
  });

  return ok({
    residentId: row.residentId,
    insurerNo: row.insurerNo,
    insuredNo: row.insuredNo,
    careLevel: row.careLevel,
    certificationDate: row.certificationDate,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    burdenRatio: row.burdenRatio,
    burdenRatioExpiresAt: row.burdenRatioExpiresAt,
  });
}

export async function getMedicalInsurance(
  residentId: string,
  session: SessionContext,
): Promise<MedicalInsuranceDetail | null> {
  const scope = await assertResidentInScope(residentId, session);
  if (!scope.ok) {
    return null;
  }
  const row = await prisma.medicalInsurance.findUnique({ where: { residentId } });
  return row
    ? {
        residentId: row.residentId,
        insurerNo: row.insurerNo,
        insuredNo: row.insuredNo,
        expiresAt: row.expiresAt,
      }
    : null;
}

export async function upsertMedicalInsurance(
  residentId: string,
  input: unknown,
  session: SessionContext,
): Promise<
  Result<MedicalInsuranceDetail, ValidationError | NotFoundError | ForbiddenError>
> {
  assertInsuranceUpdate(session);
  const scope = await assertResidentInScope(residentId, session);
  if (!scope.ok) {
    return scope;
  }

  const parsed = medicalInsuranceSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      new ValidationError("入力内容に誤りがあります", zodFieldErrors(parsed.error)),
    );
  }

  const row = await prisma.medicalInsurance.upsert({
    where: { residentId },
    create: {
      residentId,
      insurerNo: normalizeOptionalString(parsed.data.insurerNo),
      insuredNo: normalizeOptionalString(parsed.data.insuredNo),
      expiresAt: parseOptionalDateInput(parsed.data.expiresAt),
      createdBy: session.staffAccountId,
      updatedBy: session.staffAccountId,
    },
    update: {
      insurerNo: normalizeOptionalString(parsed.data.insurerNo),
      insuredNo: normalizeOptionalString(parsed.data.insuredNo),
      expiresAt: parseOptionalDateInput(parsed.data.expiresAt),
      updatedBy: session.staffAccountId,
    },
  });

  return ok({
    residentId: row.residentId,
    insurerNo: row.insurerNo,
    insuredNo: row.insuredNo,
    expiresAt: row.expiresAt,
  });
}

export async function getDisabilityWelfareInfo(
  residentId: string,
  session: SessionContext,
): Promise<DisabilityWelfareDetail | null> {
  const scope = await assertResidentInScope(residentId, session);
  if (!scope.ok) {
    return null;
  }
  const row = await prisma.disabilityWelfareInfo.findUnique({
    where: { residentId },
  });
  return row
    ? {
        residentId: row.residentId,
        recipientNo: row.recipientNo,
        supportLevel: row.supportLevel,
        serviceType: row.serviceType,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        serviceQuantity: row.serviceQuantity,
      }
    : null;
}

export async function upsertDisabilityWelfareInfo(
  residentId: string,
  input: unknown,
  session: SessionContext,
): Promise<
  Result<
    DisabilityWelfareDetail,
    ValidationError | NotFoundError | ForbiddenError
  >
> {
  assertInsuranceUpdate(session);
  const scope = await assertResidentInScope(residentId, session);
  if (!scope.ok) {
    return scope;
  }

  const parsed = disabilityWelfareSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      new ValidationError("入力内容に誤りがあります", zodFieldErrors(parsed.error)),
    );
  }

  const periodStart = parseOptionalDateInput(parsed.data.periodStart);
  const periodEnd = parseOptionalDateInput(parsed.data.periodEnd);
  const periodErrors = validatePeriod(periodStart, periodEnd);
  if (Object.keys(periodErrors).length > 0) {
    return err(new ValidationError("入力内容に誤りがあります", periodErrors));
  }

  const row = await prisma.disabilityWelfareInfo.upsert({
    where: { residentId },
    create: {
      residentId,
      recipientNo: normalizeOptionalString(parsed.data.recipientNo),
      supportLevel: normalizeOptionalString(parsed.data.supportLevel),
      serviceType: normalizeOptionalString(parsed.data.serviceType),
      periodStart,
      periodEnd,
      serviceQuantity: normalizeOptionalString(parsed.data.serviceQuantity),
      createdBy: session.staffAccountId,
      updatedBy: session.staffAccountId,
    },
    update: {
      recipientNo: normalizeOptionalString(parsed.data.recipientNo),
      supportLevel: normalizeOptionalString(parsed.data.supportLevel),
      serviceType: normalizeOptionalString(parsed.data.serviceType),
      periodStart,
      periodEnd,
      serviceQuantity: normalizeOptionalString(parsed.data.serviceQuantity),
      updatedBy: session.staffAccountId,
    },
  });

  return ok({
    residentId: row.residentId,
    recipientNo: row.recipientNo,
    supportLevel: row.supportLevel,
    serviceType: row.serviceType,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    serviceQuantity: row.serviceQuantity,
  });
}

export async function listPublicExpenses(
  residentId: string,
  session: SessionContext,
): Promise<PublicExpenseDetail[]> {
  const scope = await assertResidentInScope(residentId, session);
  if (!scope.ok) {
    return [];
  }
  const rows = await prisma.publicExpenseRecord.findMany({
    where: { residentId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    residentId: row.residentId,
    kind: row.kind,
    payerNo: row.payerNo,
    recipientNo: row.recipientNo,
    selfBurden: row.selfBurden ? Number(row.selfBurden) : null,
    expiresAt: row.expiresAt,
  }));
}

export async function addPublicExpense(
  residentId: string,
  input: unknown,
  session: SessionContext,
): Promise<
  Result<PublicExpenseDetail, ValidationError | NotFoundError | ForbiddenError>
> {
  assertInsuranceUpdate(session);
  const scope = await assertResidentInScope(residentId, session);
  if (!scope.ok) {
    return scope;
  }

  const parsed = publicExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      new ValidationError("入力内容に誤りがあります", zodFieldErrors(parsed.error)),
    );
  }

  const row = await prisma.publicExpenseRecord.create({
    data: {
      residentId,
      kind: parsed.data.kind,
      payerNo: normalizeOptionalString(parsed.data.payerNo),
      recipientNo: normalizeOptionalString(parsed.data.recipientNo),
      selfBurden:
        parsed.data.selfBurden != null
          ? new Prisma.Decimal(parsed.data.selfBurden)
          : null,
      expiresAt: parseOptionalDateInput(parsed.data.expiresAt),
      createdBy: session.staffAccountId,
      updatedBy: session.staffAccountId,
    },
  });

  return ok({
    id: row.id,
    residentId: row.residentId,
    kind: row.kind,
    payerNo: row.payerNo,
    recipientNo: row.recipientNo,
    selfBurden: row.selfBurden ? Number(row.selfBurden) : null,
    expiresAt: row.expiresAt,
  });
}

export async function updatePublicExpense(
  id: string,
  input: unknown,
  session: SessionContext,
): Promise<
  Result<
    PublicExpenseDetail,
    ValidationError | NotFoundError | ForbiddenError
  >
> {
  assertInsuranceUpdate(session);

  const existing = await prisma.publicExpenseRecord.findUnique({
    where: { id },
  });
  if (!existing) {
    return err(new NotFoundError("公費情報が見つかりません"));
  }

  const scope = await assertResidentInScope(existing.residentId, session);
  if (!scope.ok) {
    return scope;
  }

  const parsed = publicExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      new ValidationError("入力内容に誤りがあります", zodFieldErrors(parsed.error)),
    );
  }

  const row = await prisma.publicExpenseRecord.update({
    where: { id },
    data: {
      kind: parsed.data.kind,
      payerNo: normalizeOptionalString(parsed.data.payerNo),
      recipientNo: normalizeOptionalString(parsed.data.recipientNo),
      selfBurden:
        parsed.data.selfBurden != null
          ? new Prisma.Decimal(parsed.data.selfBurden)
          : null,
      expiresAt: parseOptionalDateInput(parsed.data.expiresAt),
      updatedBy: session.staffAccountId,
    },
  });

  return ok({
    id: row.id,
    residentId: row.residentId,
    kind: row.kind,
    payerNo: row.payerNo,
    recipientNo: row.recipientNo,
    selfBurden: row.selfBurden ? Number(row.selfBurden) : null,
    expiresAt: row.expiresAt,
  });
}

export async function removePublicExpense(
  id: string,
  session: SessionContext,
): Promise<Result<void, NotFoundError | ForbiddenError>> {
  assertInsuranceUpdate(session);

  const existing = await prisma.publicExpenseRecord.findUnique({
    where: { id },
  });
  if (!existing) {
    return err(new NotFoundError("公費情報が見つかりません"));
  }

  const scope = await assertResidentInScope(existing.residentId, session);
  if (!scope.ok) {
    return scope;
  }

  await prisma.publicExpenseRecord.delete({ where: { id } });
  return ok(undefined);
}
