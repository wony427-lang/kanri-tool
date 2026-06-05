import Link from "next/link";

import type { DashboardSummary } from "@/domains/dashboard/types";

function SummaryCard({
  title,
  value,
  href,
  description,
}: {
  title: string;
  value: number;
  href: string;
  description?: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-muted-foreground/20 bg-card p-5 transition-colors hover:bg-muted/40"
    >
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value.toLocaleString("ja-JP")}</p>
      {description ? (
        <p className="mt-2 text-xs text-muted-foreground">{description}</p>
      ) : null}
    </Link>
  );
}

export function DashboardSummaryCards({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="利用者数"
          value={summary.residentTotal}
          href="/residents"
          description="利用者一覧へ"
        />
        <SummaryCard
          title="期限切れアラート"
          value={summary.expiredAlertCount}
          href="/insurance-alerts?bucket=expired"
          description="期限アラート一覧へ"
        />
        <SummaryCard
          title="30日以内の更新予定"
          value={summary.upcomingAlertCount}
          href="/insurance-alerts?bucket=within_30"
          description="期限アラート一覧へ"
        />
        <SummaryCard
          title="未請求（総合保険）"
          value={summary.unbilledComprehensiveCount}
          href="/comprehensive-insurance/unbilled"
          description="未請求一覧へ"
        />
      </div>

      {summary.residentsByFacility.length > 0 ? (
        <section className="rounded-lg border border-muted-foreground/20">
          <h2 className="border-b border-muted-foreground/20 px-4 py-3 text-sm font-medium">
            施設別利用者数
          </h2>
          <ul className="divide-y divide-muted-foreground/20">
            {summary.residentsByFacility.map((row) => (
              <li
                key={row.facilityId}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span>{row.facilityName}</span>
                <span className="tabular-nums">{row.count.toLocaleString("ja-JP")} 名</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
