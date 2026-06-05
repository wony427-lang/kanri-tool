import Link from "next/link";
import { notFound } from "next/navigation";

import { getResidentAction } from "@/domains/residents/actions";
import {
  canDeleteResidents,
  canManageResidents,
} from "@/domains/residents/service";
import { isPermissionAllowed } from "@/shared/authorization/policy";
import { requireSession } from "@/shared/authorization/service";
import { CARE_LEVEL_LABELS, USAGE_STATUS_LABELS } from "@/shared/domain/labels";
import { DetailPage } from "@/shared/ui/layouts";

import { PdfExportLink } from "../PdfExportLink";
import { ResidentDetailSections } from "../ResidentDetailSections";
import { ResidentExternalVendorSection } from "../ResidentExternalVendorSection";
import { ResidentInsuranceSections } from "../ResidentInsuranceSections";

function formatDate(date: Date | null): string {
  return date ? date.toLocaleDateString("ja-JP") : "—";
}

export default async function ResidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const resident = await getResidentAction(id);

  if (!resident) {
    notFound();
  }

  const canEdit = canManageResidents(session);
  const canDelete = canDeleteResidents(session);
  const canExportPdf = isPermissionAllowed(session.role, "resident:pdf_export");

  return (
    <DetailPage
      title={resident.name}
      subtitle={`${resident.facilityName} / ${USAGE_STATUS_LABELS[resident.usageStatus]}`}
      actions={
        <div className="flex gap-2">
          {canExportPdf ? <PdfExportLink residentId={id} /> : null}
          {canEdit ? (
            <Link
              href={`/residents/${id}/edit`}
              className="inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              基本情報を編集
            </Link>
          ) : null}
        </div>
      }
    >
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted-foreground">フリガナ</dt>
          <dd>{resident.nameKana}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">生年月日 / 年齢</dt>
          <dd>
            {formatDate(resident.birthDate)}（{resident.age}歳）
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">性別</dt>
          <dd>{resident.gender}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">要介護度</dt>
          <dd>
            {resident.careLevel
              ? CARE_LEVEL_LABELS[resident.careLevel]
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">入居日</dt>
          <dd>{formatDate(resident.moveInDate)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">退去日</dt>
          <dd>{formatDate(resident.moveOutDate)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">住所</dt>
          <dd>{resident.address ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">電話 / 携帯</dt>
          <dd>
            {resident.phone ?? "—"} / {resident.mobile ?? "—"}
          </dd>
        </div>
      </dl>

      <ResidentDetailSections
        resident={resident}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      <ResidentInsuranceSections residentId={id} session={session} />

      <ResidentExternalVendorSection residentId={id} session={session} />
    </DetailPage>
  );
}
