import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";

import {
  getCareInsurance,
  getDisabilityWelfareInfo,
  getMedicalInsurance,
  listPublicExpenses,
} from "@/domains/insurance/service";
import { getResidentById } from "@/domains/residents/service";
import type { SessionContext } from "@/shared/authorization/types";
import { ForbiddenError } from "@/shared/authorization/errors";
import { isPermissionAllowed } from "@/shared/authorization/policy";
import { writeAuditLog } from "@/shared/audit-log";
import { NotFoundError } from "@/shared/domain/errors";
import { ok, type Result } from "@/shared/domain/result";
import { prisma } from "@/shared/db/prisma";

import { registerPdfFonts } from "./fonts";
import { ResidentProfileDocument } from "./ResidentProfileDocument";
import type { ResidentPdfData } from "./types";

function assertCanExport(session: SessionContext): void {
  if (
    !session.isActive ||
    !isPermissionAllowed(session.role, "resident:pdf_export")
  ) {
    throw new ForbiddenError();
  }
}

async function loadPdfData(
  residentId: string,
  session: SessionContext,
): Promise<Result<ResidentPdfData, NotFoundError | ForbiddenError>> {
  const residentResult = await getResidentById(residentId, session);
  if (!residentResult.ok) {
    return residentResult;
  }

  const staff = await prisma.staffAccount.findUnique({
    where: { id: session.staffAccountId },
    select: { displayName: true },
  });

  const [careInsurance, medicalInsurance, disability, publicExpenses] =
    await Promise.all([
      getCareInsurance(residentId, session),
      getMedicalInsurance(residentId, session),
      getDisabilityWelfareInfo(residentId, session),
      listPublicExpenses(residentId, session),
    ]);

  return ok({
    resident: residentResult.value,
    careInsurance,
    medicalInsurance,
    disability,
    publicExpenses,
    exportedAt: new Date(),
    exportedBy: staff?.displayName ?? "職員",
  });
}

export async function renderResidentProfilePdf(
  residentId: string,
  session: SessionContext,
  ip: string | null,
): Promise<Result<Uint8Array, NotFoundError | ForbiddenError>> {
  assertCanExport(session);

  const dataResult = await loadPdfData(residentId, session);
  if (!dataResult.ok) {
    return dataResult;
  }

  registerPdfFonts();
  const buffer = await renderToBuffer(
    <ResidentProfileDocument data={dataResult.value} />,
  );

  await writeAuditLog({
    kind: "pdf_exported",
    actorStaffAccountId: session.staffAccountId,
    targetType: "resident",
    targetId: residentId,
    ip,
    metadata: { facilityId: dataResult.value.resident.facilityId },
  });

  return ok(new Uint8Array(buffer));
}
