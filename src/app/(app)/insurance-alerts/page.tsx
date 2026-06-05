import { Suspense } from "react";

import { listAlertsAction } from "@/domains/expiration-alerts/actions";
import { isPermissionAllowed } from "@/shared/authorization/policy";
import { requireSession } from "@/shared/authorization/service";
import { parseFacilityScopeParams } from "@/shared/authorization/facility-scope";
import type { AlertBucket } from "@/shared/domain/date";
import type { InsuranceAlertKind } from "@/domains/expiration-alerts/types";
import { ListPage } from "@/shared/ui/layouts";
import { BoundaryLoading } from "@/shared/ui/layouts/BoundaryLoading";

import { InsuranceAlertsClient } from "./InsuranceAlertsClient";

export default async function InsuranceAlertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const scopeParams = parseFacilityScopeParams(params);

  const alerts = await listAlertsAction({
    bucket: params.bucket as AlertBucket | undefined,
    insuranceKind: params.insuranceKind as InsuranceAlertKind | undefined,
    ...scopeParams,
  });

  return (
    <ListPage
      title="期限アラート"
      subtitle="保険・公費等の有効期限が近づいている利用者一覧"
    >
      <Suspense fallback={<BoundaryLoading />}>
        <InsuranceAlertsClient
          alerts={alerts}
          canUpdate={isPermissionAllowed(session.role, "alert:update_status")}
        />
      </Suspense>
    </ListPage>
  );
}
