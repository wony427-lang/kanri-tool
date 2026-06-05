import Link from "next/link";

import {
  AUDIT_KIND_LABELS,
  listAuditLogsForAdmin,
} from "@/domains/audit-logs/service";
import type { AuditEventKind } from "@/shared/audit-log/types";
import { ListPage } from "@/shared/ui/layouts";

const ALL_KINDS = Object.keys(AUDIT_KIND_LABELS) as AuditEventKind[];

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const defaults = defaultDateRange();
  const from =
    typeof rawParams.from === "string" ? rawParams.from : defaults.from;
  const to = typeof rawParams.to === "string" ? rawParams.to : defaults.to;
  const kind =
    typeof rawParams.kind === "string" &&
    ALL_KINDS.includes(rawParams.kind as AuditEventKind)
      ? (rawParams.kind as AuditEventKind)
      : undefined;
  const actorStaffAccountId =
    typeof rawParams.actorStaffAccountId === "string"
      ? rawParams.actorStaffAccountId
      : undefined;
  const targetId =
    typeof rawParams.targetId === "string" ? rawParams.targetId : undefined;
  const cursor =
    typeof rawParams.cursor === "string" ? rawParams.cursor : undefined;

  const { items, nextCursor } = await listAuditLogsForAdmin({
    from,
    to,
    kind,
    actorStaffAccountId,
    targetId,
    cursor,
  });

  const queryBase = new URLSearchParams({ from, to });
  if (kind) {
    queryBase.set("kind", kind);
  }
  if (actorStaffAccountId) {
    queryBase.set("actorStaffAccountId", actorStaffAccountId);
  }
  if (targetId) {
    queryBase.set("targetId", targetId);
  }

  return (
    <ListPage title="監査ログ" subtitle="操作履歴（管理者のみ）">
      <form method="get" className="mb-4 grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">開始日</span>
          <input type="date" name="from" defaultValue={from} className="rounded-md border px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">終了日</span>
          <input type="date" name="to" defaultValue={to} className="rounded-md border px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">種別</span>
          <select name="kind" defaultValue={kind ?? ""} className="rounded-md border px-2 py-1">
            <option value="">すべて</option>
            {ALL_KINDS.map((value) => (
              <option key={value} value={value}>
                {AUDIT_KIND_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">操作者 ID</span>
          <input
            name="actorStaffAccountId"
            defaultValue={actorStaffAccountId ?? ""}
            placeholder="UUID"
            className="rounded-md border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-muted-foreground">対象 ID</span>
          <input
            name="targetId"
            defaultValue={targetId ?? ""}
            placeholder="UUID"
            className="rounded-md border px-2 py-1"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            絞り込み
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left">日時</th>
              <th className="px-3 py-2 text-left">種別</th>
              <th className="px-3 py-2 text-left">操作者 ID</th>
              <th className="px-3 py-2 text-left">対象種別</th>
              <th className="px-3 py-2 text-left">対象 ID</th>
              <th className="px-3 py-2 text-left">IP</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  該当するログがありません
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.createdAt.toLocaleString("ja-JP")}
                  </td>
                  <td className="px-3 py-2">{AUDIT_KIND_LABELS[row.kind]}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {row.actorStaffAccountId ?? "—"}
                  </td>
                  <td className="px-3 py-2">{row.targetType}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.targetId ?? "—"}</td>
                  <td className="px-3 py-2">{row.ip ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {nextCursor ? (
        <div className="mt-4">
          <Link
            href={`/audit-logs?${queryBase.toString()}&cursor=${nextCursor}`}
            className="inline-flex rounded-md border px-4 py-2 text-sm hover:bg-muted"
          >
            さらに読み込む
          </Link>
        </div>
      ) : null}
    </ListPage>
  );
}
