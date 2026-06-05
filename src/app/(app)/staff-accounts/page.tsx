import Link from "next/link";

import { listFacilitiesAction } from "@/domains/facilities/actions";
import { listStaffAccountsAction } from "@/domains/staff-accounts/actions";
import { ROLE_LABELS } from "@/shared/domain/labels";
import { ListPage } from "@/shared/ui/layouts";

import { PasswordResetButton } from "./PasswordResetButton";

export default async function StaffAccountsPage() {
  const [accounts, facilities] = await Promise.all([
    listStaffAccountsAction(),
    listFacilitiesAction(),
  ]);
  const facilityNames = new Map(facilities.map((f) => [f.id, f.name]));

  return (
    <ListPage
      title="職員管理"
      subtitle="職員アカウントの一覧"
      actions={
        <Link
          href="/staff-accounts/new"
          className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          新規職員
        </Link>
      }
    >
      <div className="overflow-x-auto rounded-lg border border-muted-foreground/20">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left">表示名</th>
              <th className="px-4 py-3 text-left">従業員 ID</th>
              <th className="px-4 py-3 text-left">役割</th>
              <th className="px-4 py-3 text-left">所属施設</th>
              <th className="px-4 py-3 text-left">状態</th>
              <th className="px-4 py-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr
                key={account.id}
                className="border-t border-muted-foreground/20"
              >
                <td className="px-4 py-3">{account.displayName}</td>
                <td className="px-4 py-3">{account.loginId}</td>
                <td className="px-4 py-3">{ROLE_LABELS[account.role]}</td>
                <td className="px-4 py-3">
                  {account.facilityIds
                    .map((id) => facilityNames.get(id) ?? id)
                    .join("、")}
                </td>
                <td className="px-4 py-3">
                  {account.isActive ? "有効" : "停止"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/staff-accounts/${account.id}`}
                      className="rounded-md border px-2 py-1 hover:bg-muted"
                    >
                      詳細
                    </Link>
                    <PasswordResetButton staffAccountId={account.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ListPage>
  );
}
