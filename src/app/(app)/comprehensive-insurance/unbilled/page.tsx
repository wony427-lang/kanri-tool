import { listUnbilledAction } from "@/domains/comprehensive-insurance/actions";
import { isPermissionAllowed } from "@/shared/authorization/policy";
import { requireSession } from "@/shared/authorization/service";
import { parseFacilityScopeParams } from "@/shared/authorization/facility-scope";
import { ListPage } from "@/shared/ui/layouts";

import { UnbilledListClient } from "./UnbilledListClient";

export default async function UnbilledPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const rawParams = await searchParams;
  const scopeParams = parseFacilityScopeParams(rawParams);
  const items = await listUnbilledAction(scopeParams);

  return (
    <ListPage
      title="未請求一覧"
      subtitle="次回請求予定日が本日以前で、未請求の利用者総合保険"
    >
      <UnbilledListClient
        items={items}
        canUpdate={isPermissionAllowed(
          session.role,
          "comprehensive_insurance:update_status",
        )}
      />
    </ListPage>
  );
}
