import { getDashboardSummary } from "@/domains/dashboard/service";
import { requireSession } from "@/shared/authorization/service";
import { ListPage } from "@/shared/ui/layouts";

import { DashboardSummaryCards } from "./DashboardSummaryCards";

export default async function DashboardPage() {
  const session = await requireSession();

  // 全従業員が同じサマリを見る（施設所属・ヘッダの施設フィルタは反映しない）
  const summary = await getDashboardSummary(session);

  return (
    <ListPage title="ダッシュボード" subtitle="利用状況サマリ">
      <DashboardSummaryCards summary={summary} />
    </ListPage>
  );
}
