import "server-only";

import type { SessionContext } from "@/shared/authorization/types";
import { ForbiddenError } from "@/shared/authorization/errors";
import { isPermissionAllowed } from "@/shared/authorization/policy";
import { NotFoundError, ValidationError } from "@/shared/domain/errors";
import { err, ok, type Result } from "@/shared/domain/result";
import { prisma } from "@/shared/db/prisma";

import { findResidentForSession } from "@/domains/residents/service";

import {
  isDuplicateVendorIdentity,
  vendorKeyFormSchema,
  zodFieldErrors,
} from "./schemas";
import type { ExternalVendorKeyDetail, VendorKeyInput } from "./types";

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

function toDetail(row: {
  id: string;
  residentId: string;
  vendorType: ExternalVendorKeyDetail["vendorType"];
  vendorName: string;
  uniqueKey: string;
  notes: string | null;
}): ExternalVendorKeyDetail {
  return {
    id: row.id,
    residentId: row.residentId,
    vendorType: row.vendorType,
    vendorName: row.vendorName,
    uniqueKey: row.uniqueKey,
    notes: row.notes,
  };
}

export async function listVendorKeys(
  residentId: string,
  session: SessionContext,
): Promise<ExternalVendorKeyDetail[]> {
  assertCanRead(session);
  const scope = await assertResidentInScope(residentId, session);
  if (!scope.ok) {
    return [];
  }

  const rows = await prisma.externalVendorKey.findMany({
    where: { residentId },
    orderBy: [{ vendorType: "asc" }, { vendorName: "asc" }],
  });
  return rows.map(toDetail);
}

export async function addVendorKey(
  residentId: string,
  input: VendorKeyInput,
  session: SessionContext,
): Promise<
  Result<ExternalVendorKeyDetail, ValidationError | NotFoundError | ForbiddenError>
> {
  assertCanUpdate(session);
  const scope = await assertResidentInScope(residentId, session);
  if (!scope.ok) {
    return scope;
  }

  const parsed = vendorKeyFormSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      new ValidationError("入力内容に誤りがあります", zodFieldErrors(parsed.error)),
    );
  }

  const existing = await prisma.externalVendorKey.findMany({
    where: { residentId },
    select: { id: true, vendorType: true, vendorName: true },
  });

  if (
    isDuplicateVendorIdentity(existing, {
      vendorType: parsed.data.vendorType,
      vendorName: parsed.data.vendorName,
    })
  ) {
    return err(
      new ValidationError("同一の業者種別・業者名が既に登録されています", {
        vendorName: "同一の業者種別・業者名が既に登録されています",
      }),
    );
  }

  try {
    const row = await prisma.externalVendorKey.create({
      data: {
        residentId,
        vendorType: parsed.data.vendorType,
        vendorName: parsed.data.vendorName,
        uniqueKey: parsed.data.uniqueKey,
        notes: parsed.data.notes?.trim() || null,
        createdBy: session.staffAccountId,
        updatedBy: session.staffAccountId,
      },
    });
    return ok(toDetail(row));
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return err(
        new ValidationError("同一の業者種別・業者名が既に登録されています", {
          vendorName: "同一の業者種別・業者名が既に登録されています",
        }),
      );
    }
    throw error;
  }
}

export async function updateVendorKey(
  id: string,
  input: VendorKeyInput,
  session: SessionContext,
): Promise<
  Result<ExternalVendorKeyDetail, ValidationError | NotFoundError | ForbiddenError>
> {
  assertCanUpdate(session);

  const current = await prisma.externalVendorKey.findUnique({ where: { id } });
  if (!current) {
    return err(new NotFoundError("外部業者連携キーが見つかりません"));
  }

  const scope = await assertResidentInScope(current.residentId, session);
  if (!scope.ok) {
    return scope;
  }

  const parsed = vendorKeyFormSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      new ValidationError("入力内容に誤りがあります", zodFieldErrors(parsed.error)),
    );
  }

  const existing = await prisma.externalVendorKey.findMany({
    where: { residentId: current.residentId },
    select: { id: true, vendorType: true, vendorName: true },
  });

  if (
    isDuplicateVendorIdentity(existing, {
      vendorType: parsed.data.vendorType,
      vendorName: parsed.data.vendorName,
      excludeId: id,
    })
  ) {
    return err(
      new ValidationError("同一の業者種別・業者名が既に登録されています", {
        vendorName: "同一の業者種別・業者名が既に登録されています",
      }),
    );
  }

  try {
    const row = await prisma.externalVendorKey.update({
      where: { id },
      data: {
        vendorType: parsed.data.vendorType,
        vendorName: parsed.data.vendorName,
        uniqueKey: parsed.data.uniqueKey,
        notes: parsed.data.notes?.trim() || null,
        updatedBy: session.staffAccountId,
      },
    });
    return ok(toDetail(row));
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return err(
        new ValidationError("同一の業者種別・業者名が既に登録されています", {
          vendorName: "同一の業者種別・業者名が既に登録されています",
        }),
      );
    }
    throw error;
  }
}

export async function deleteVendorKey(
  id: string,
  session: SessionContext,
): Promise<Result<void, NotFoundError | ForbiddenError>> {
  assertCanUpdate(session);

  const current = await prisma.externalVendorKey.findUnique({ where: { id } });
  if (!current) {
    return err(new NotFoundError("外部業者連携キーが見つかりません"));
  }

  const scope = await assertResidentInScope(current.residentId, session);
  if (!scope.ok) {
    return scope;
  }

  await prisma.externalVendorKey.delete({ where: { id } });
  return ok(undefined);
}
