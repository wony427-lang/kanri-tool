import "server-only";

import { Prisma } from "@prisma/client";

import type { SessionContext } from "@/shared/authorization/types";
import { ForbiddenError } from "@/shared/authorization/errors";
import { isPermissionAllowed } from "@/shared/authorization/policy";
import {
  resolveResidentFacilityScope,
  type FacilityScopeParams,
} from "@/shared/authorization/facility-scope";
import {
  calculateNextBillingDate,
  parseOptionalDateInput,
  validatePeriod,
} from "@/shared/domain/date";
import { NotFoundError, ValidationError } from "@/shared/domain/errors";
import { err, ok, type Result } from "@/shared/domain/result";
import { prisma } from "@/shared/db/prisma";

import { findResidentForSession } from "@/domains/residents/service";

import { comprehensiveInsuranceSchema, zodFieldErrors } from "./schemas";
import type {
  ComprehensiveInsuranceDetail,
  ComprehensiveInsuranceHistoryItem,
  UnbilledItem,
} from "./types";

function assertCanRead(session: SessionContext): void {
  if (!session.isActive || !isPermissionAllowed(session.role, "resident:read")) {
    throw new ForbiddenError();
  }
}

function assertCanUpdateStatus(session: SessionContext): void {
  if (
    !session.isActive ||
    !isPermissionAllowed(session.role, "comprehensive_insurance:update_status")
  ) {
    throw new ForbiddenError();
  }
}

function assertCanUpdateInsurance(session: SessionContext): void {
  if (!session.isActive || !isPermissionAllowed(session.role, "insurance:update")) {
    throw new ForbiddenError();
  }
}

async function assertRecordInScope(
  recordId: string,
  session: SessionContext,
): Promise<
  Result<
    { record: ComprehensiveInsuranceDetail; facilityIds: string[] },
    NotFoundError
  >
> {
  const record = await prisma.comprehensiveInsuranceRecord.findUnique({
    where: { id: recordId },
    include: { resident: { select: { facilityId: true } } },
  });
  if (!record) {
    return err(new NotFoundError("利用者総合保険が見つかりません"));
  }

  const resident = await findResidentForSession(record.residentId, session);
  if (!resident) {
    return err(new NotFoundError("利用者総合保険が見つかりません"));
  }

  return ok({
    record: toDetail(record),
    facilityIds: [resident.facilityId],
  });
}

function toDetail(row: {
  id: string;
  residentId: string;
  enrolled: boolean;
  insurerName: string | null;
  policyNo: string | null;
  joinedAt: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  annualPremium: Prisma.Decimal | null;
  nextBillingDate: Date | null;
  billingStatus: ComprehensiveInsuranceDetail["billingStatus"];
  paymentStatus: ComprehensiveInsuranceDetail["paymentStatus"];
  notes: string | null;
}): ComprehensiveInsuranceDetail {
  return {
    id: row.id,
    residentId: row.residentId,
    enrolled: row.enrolled,
    insurerName: row.insurerName,
    policyNo: row.policyNo,
    joinedAt: row.joinedAt,
    startDate: row.startDate,
    endDate: row.endDate,
    annualPremium: row.annualPremium ? Number(row.annualPremium) : null,
    nextBillingDate: row.nextBillingDate,
    billingStatus: row.billingStatus,
    paymentStatus: row.paymentStatus,
    notes: row.notes,
  };
}

export async function getCurrentComprehensiveInsurance(
  residentId: string,
  session: SessionContext,
): Promise<ComprehensiveInsuranceDetail | null> {
  assertCanRead(session);
  const resident = await findResidentForSession(residentId, session);
  if (!resident) {
    return null;
  }

  const row = await prisma.comprehensiveInsuranceRecord.findFirst({
    where: { residentId },
    orderBy: { updatedAt: "desc" },
  });
  return row ? toDetail(row) : null;
}

export async function listComprehensiveInsuranceHistory(
  residentId: string,
  session: SessionContext,
): Promise<ComprehensiveInsuranceHistoryItem[]> {
  assertCanRead(session);
  const resident = await findResidentForSession(residentId, session);
  if (!resident) {
    return [];
  }

  const rows = await prisma.comprehensiveInsuranceRecord.findMany({
    where: { residentId },
    orderBy: { updatedAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.id,
    enrolled: row.enrolled,
    insurerName: row.insurerName,
    policyNo: row.policyNo,
    joinedAt: row.joinedAt,
    startDate: row.startDate,
    endDate: row.endDate,
    annualPremium: row.annualPremium ? Number(row.annualPremium) : null,
    nextBillingDate: row.nextBillingDate,
    billingStatus: row.billingStatus,
    paymentStatus: row.paymentStatus,
    updatedAt: row.updatedAt,
  }));
}

export async function upsertComprehensiveInsurance(
  residentId: string,
  input: unknown,
  session: SessionContext,
): Promise<
  Result<
    ComprehensiveInsuranceDetail,
    ValidationError | NotFoundError | ForbiddenError
  >
> {
  assertCanUpdateInsurance(session);
  const resident = await findResidentForSession(residentId, session);
  if (!resident) {
    return err(new NotFoundError("利用者が見つかりません"));
  }

  const parsed = comprehensiveInsuranceSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      new ValidationError("入力内容に誤りがあります", zodFieldErrors(parsed.error)),
    );
  }

  const enrolled = parsed.data.enrolled === "true";
  const joinedAt = parseOptionalDateInput(parsed.data.joinedAt);
  const startDate = parseOptionalDateInput(parsed.data.startDate);
  const endDate = parseOptionalDateInput(parsed.data.endDate);
  const periodErrors = validatePeriod(startDate, endDate);
  if (Object.keys(periodErrors).length > 0) {
    return err(new ValidationError("入力内容に誤りがあります", periodErrors));
  }

  const existing = await prisma.comprehensiveInsuranceRecord.findFirst({
    where: { residentId },
    orderBy: { updatedAt: "desc" },
  });

  const nextBillingDate =
    enrolled && (startDate ?? joinedAt)
      ? calculateNextBillingDate(startDate ?? joinedAt!)
      : null;

  const data = {
    enrolled,
    insurerName: enrolled ? parsed.data.insurerName?.trim() || null : null,
    policyNo: enrolled ? parsed.data.policyNo?.trim() || null : null,
    joinedAt: enrolled ? joinedAt : null,
    startDate: enrolled ? startDate : null,
    endDate: enrolled ? endDate : null,
    annualPremium:
      enrolled && parsed.data.annualPremium != null
        ? new Prisma.Decimal(parsed.data.annualPremium)
        : null,
    nextBillingDate: enrolled ? nextBillingDate : null,
    billingStatus: enrolled ? ("unbilled" as const) : ("unbilled" as const),
    paymentStatus: enrolled ? ("unpaid" as const) : ("unpaid" as const),
    notes: parsed.data.notes?.trim() || null,
    updatedBy: session.staffAccountId,
  };

  const row = existing
    ? await prisma.comprehensiveInsuranceRecord.update({
        where: { id: existing.id },
        data: enrolled
          ? data
          : {
              ...data,
              billingStatus: "unbilled",
              paymentStatus: "unpaid",
            },
      })
    : await prisma.comprehensiveInsuranceRecord.create({
        data: {
          residentId,
          ...data,
          createdBy: session.staffAccountId,
        },
      });

  return ok(toDetail(row));
}

export async function markBilled(
  recordId: string,
  session: SessionContext,
): Promise<
  Result<ComprehensiveInsuranceDetail, NotFoundError | ForbiddenError>
> {
  assertCanUpdateStatus(session);
  const scoped = await assertRecordInScope(recordId, session);
  if (!scoped.ok) {
    return scoped;
  }

  const { record } = scoped.value;
  if (!record.enrolled) {
    throw new ForbiddenError();
  }

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.comprehensiveInsuranceRecord.update({
      where: { id: recordId },
      data: {
        billingStatus: "billed",
        updatedBy: session.staffAccountId,
      },
    });
    await tx.auditLog.create({
      data: {
        kind: "resident_updated",
        actorStaffAccountId: session.staffAccountId,
        targetType: "resident",
        targetId: updated.residentId,
        metadata: {
          comprehensiveInsuranceId: recordId,
          action: "comprehensive_billed",
        },
      },
    });
    return updated;
  });

  return ok(toDetail(row));
}

export async function markPaid(
  recordId: string,
  session: SessionContext,
): Promise<
  Result<ComprehensiveInsuranceDetail, NotFoundError | ForbiddenError>
> {
  assertCanUpdateStatus(session);
  const scoped = await assertRecordInScope(recordId, session);
  if (!scoped.ok) {
    return scoped;
  }

  const { record } = scoped.value;
  if (!record.enrolled || record.billingStatus !== "billed") {
    throw new ForbiddenError();
  }

  const baseDate = record.nextBillingDate ?? record.startDate ?? new Date();
  const nextBillingDate = calculateNextBillingDate(baseDate);

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.comprehensiveInsuranceRecord.update({
      where: { id: recordId },
      data: {
        paymentStatus: "paid",
        billingStatus: "unbilled",
        nextBillingDate,
        updatedBy: session.staffAccountId,
      },
    });
    await tx.auditLog.create({
      data: {
        kind: "resident_updated",
        actorStaffAccountId: session.staffAccountId,
        targetType: "resident",
        targetId: updated.residentId,
        metadata: {
          comprehensiveInsuranceId: recordId,
          action: "comprehensive_paid",
          nextBillingDate: nextBillingDate.toISOString().slice(0, 10),
        },
      },
    });
    return updated;
  });

  return ok(toDetail(row));
}

export async function listUnbilled(
  session: SessionContext,
  params: FacilityScopeParams = {},
): Promise<UnbilledItem[]> {
  assertCanRead(session);
  const facilityIds = await resolveResidentFacilityScope(session, params);
  if (facilityIds.length === 0) {
    return [];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = await prisma.comprehensiveInsuranceRecord.findMany({
    where: {
      enrolled: true,
      billingStatus: "unbilled",
      nextBillingDate: { lte: today },
      resident: { facilityId: { in: [...facilityIds] } },
    },
    include: {
      resident: {
        select: {
          id: true,
          name: true,
          facilityId: true,
          facility: { select: { name: true } },
        },
      },
    },
    orderBy: [{ nextBillingDate: "asc" }, { resident: { name: "asc" } }],
  });

  return rows.map((row) => ({
    recordId: row.id,
    residentId: row.resident.id,
    residentName: row.resident.name,
    facilityId: row.resident.facilityId,
    facilityName: row.resident.facility.name,
    nextBillingDate: row.nextBillingDate!,
    annualPremium: row.annualPremium ? Number(row.annualPremium) : null,
    billingStatus: row.billingStatus,
    paymentStatus: row.paymentStatus,
  }));
}

export { calculateNextBillingDate } from "@/shared/domain/date";
