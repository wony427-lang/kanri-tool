"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { markBilledAction } from "@/domains/comprehensive-insurance/actions";
import type { UnbilledItem } from "@/domains/comprehensive-insurance/types";
import { Button } from "@/shared/ui/primitives/button";
import { useToast } from "@/shared/ui/primitives/toast";

export function UnbilledListClient({
  items,
  canUpdate,
}: {
  items: UnbilledItem[];
  canUpdate: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  function handleMarkBilled(recordId: string) {
    startTransition(async () => {
      const result = await markBilledAction(recordId);
      if (result.ok) {
        showToast({ message: "請求済みに更新しました", variant: "success" });
        router.refresh();
      } else {
        showToast({ message: result.message, variant: "error" });
      }
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left">利用者</th>
            <th className="px-4 py-3 text-left">所属施設</th>
            <th className="px-4 py-3 text-left">次回請求予定日</th>
            <th className="px-4 py-3 text-left">年間保険料</th>
            <th className="px-4 py-3 text-left">操作</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                未請求の利用者はいません
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.recordId} className="border-t">
                <td className="px-4 py-3">
                  <Link
                    href={`/residents/${item.residentId}#comprehensive-insurance`}
                    className="text-primary underline"
                  >
                    {item.residentName}
                  </Link>
                </td>
                <td className="px-4 py-3">{item.facilityName}</td>
                <td className="px-4 py-3">
                  {item.nextBillingDate.toLocaleDateString("ja-JP")}
                </td>
                <td className="px-4 py-3">
                  {item.annualPremium?.toLocaleString() ?? "—"}円
                </td>
                <td className="px-4 py-3">
                  {canUpdate ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => handleMarkBilled(item.recordId)}
                    >
                      請求済みにする
                    </Button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
