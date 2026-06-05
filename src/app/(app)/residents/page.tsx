import { Suspense } from "react";

import {
  listAccessibleFacilitiesAction,
} from "@/domains/residents/actions";
import {
  canManageResidents,
  searchResidents,
} from "@/domains/residents/service";
import { requireSession } from "@/shared/authorization/service";
import { parseFacilityScopeParams } from "@/shared/authorization/facility-scope";
import { isPermissionAllowed } from "@/shared/authorization/policy";
import { residentSearchSchema } from "@/domains/residents/schemas";
import { ListPage } from "@/shared/ui/layouts";
import { BoundaryLoading } from "@/shared/ui/layouts/BoundaryLoading";

import { ResidentsListClient } from "./ResidentsListClient";

export default async function ResidentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const rawParams = await searchParams;
  const scopeParams = parseFacilityScopeParams(rawParams);
  const parsed = residentSearchSchema.safeParse({
    keyword: rawParams.keyword,
    careLevel: rawParams.careLevel,
    facilityId: rawParams.facilityId,
    primaryDoctor: rawParams.primaryDoctor,
    careManagerKeyword: rawParams.careManagerKeyword,
    usageStatus: rawParams.usageStatus,
    page: rawParams.page ?? 1,
    pageSize: rawParams.pageSize ?? 20,
    sortColumn: rawParams.sortColumn ?? "name",
    sortDirection: rawParams.sortDirection ?? "asc",
  });

  const params = parsed.success
    ? parsed.data
    : residentSearchSchema.parse({});

  const [{ items, total }, facilities] = await Promise.all([
    searchResidents(
      {
        keyword: params.keyword,
        careLevel: params.careLevel,
        facilityId: params.facilityId,
        primaryDoctor: params.primaryDoctor,
        careManagerKeyword: params.careManagerKeyword,
        usageStatus: params.usageStatus,
        pagination: {
          offset: (params.page - 1) * params.pageSize,
          limit: params.pageSize,
        },
        sort: {
          column: params.sortColumn,
          direction: params.sortDirection,
        },
      },
      session,
      scopeParams,
    ),
    listAccessibleFacilitiesAction(),
  ]);

  const canExportPdf = isPermissionAllowed(session.role, "resident:pdf_export");

  return (
    <ListPage title="利用者" subtitle="利用者一覧・検索">
      <Suspense fallback={<BoundaryLoading />}>
        <ResidentsListClient
          items={items}
          total={total}
          facilities={facilities}
          canCreate={canManageResidents(session)}
          canExportPdf={canExportPdf}
          page={params.page}
          pageSize={params.pageSize}
          sortColumn={params.sortColumn}
          sortDirection={params.sortDirection}
        />
      </Suspense>
    </ListPage>
  );
}
