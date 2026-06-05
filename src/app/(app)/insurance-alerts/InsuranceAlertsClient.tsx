"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { updateAlertStatusAction } from "@/domains/expiration-alerts/actions";
import { insuranceEditHref } from "@/domains/expiration-alerts/href";
import type { ExpirationAlertItem } from "@/domains/expiration-alerts/types";
import {
  ALERT_BUCKET_LABELS,
  ALERT_STATUS_LABELS,
  INSURANCE_KIND_LABELS,
} from "@/shared/domain/labels";
import type { AlertBucket } from "@/shared/domain/date";
import { useToast } from "@/shared/ui/primitives/toast";

export function InsuranceAlertsClient({
  alerts,
  canUpdate,
}: {
  alerts: ExpirationAlertItem[];
  canUpdate: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/insurance-alerts?${params.toString()}`);
  }

  function handleStatusChange(alertId: string, status: string) {
    startTransition(async () => {
      const result = await updateAlertStatusAction({
        alertId,
        status: status as "not_handled" | "confirmed" | "contacted" | "renewed",
      });
      if (result.ok) {
        showToast({ message: "対応状況を更新しました", variant: "success" });
        router.refresh();
      } else {
        showToast({ message: result.message, variant: "error" });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <select
          defaultValue={searchParams.get("bucket") ?? ""}
          onChange={(event) => updateFilter("bucket", event.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">区分（すべて）</option>
          {Object.entries(ALERT_BUCKET_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          defaultValue={searchParams.get("insuranceKind") ?? ""}
          onChange={(event) => updateFilter("insuranceKind", event.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">保険種別（すべて）</option>
          {Object.entries(INSURANCE_KIND_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left">利用者</th>
              <th className="px-4 py-3 text-left">施設</th>
              <th className="px-4 py-3 text-left">保険種別</th>
              <th className="px-4 py-3 text-left">有効期限</th>
              <th className="px-4 py-3 text-left">残り日数</th>
              <th className="px-4 py-3 text-left">区分</th>
              <th className="px-4 py-3 text-left">対応状況</th>
              <th className="px-4 py-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  該当するアラートはありません
                </td>
              </tr>
            ) : (
              alerts.map((alert) => (
                <tr key={alert.id} className="border-t">
                  <td className="px-4 py-3">{alert.residentName}</td>
                  <td className="px-4 py-3">{alert.facilityName}</td>
                  <td className="px-4 py-3">
                    {INSURANCE_KIND_LABELS[alert.insuranceKind]}
                  </td>
                  <td className="px-4 py-3">
                    {alert.endDate.toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-4 py-3">{alert.remainingDays}日</td>
                  <td className="px-4 py-3">
                    {ALERT_BUCKET_LABELS[alert.bucket as AlertBucket]}
                  </td>
                  <td className="px-4 py-3">
                    {canUpdate ? (
                      <select
                        defaultValue={alert.handleStatus}
                        disabled={pending}
                        onChange={(event) =>
                          handleStatusChange(alert.id, event.target.value)
                        }
                        className="rounded-md border px-2 py-1 text-sm"
                      >
                        {Object.entries(ALERT_STATUS_LABELS).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    ) : (
                      ALERT_STATUS_LABELS[alert.handleStatus]
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/residents/${alert.residentId}`}
                        className="text-primary underline"
                      >
                        詳細
                      </Link>
                      <Link
                        href={insuranceEditHref(alert)}
                        className="text-primary underline"
                      >
                        保険編集
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
