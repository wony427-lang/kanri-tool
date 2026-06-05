import Link from "next/link";
import { notFound } from "next/navigation";

import { listFacilitiesAction } from "@/domains/facilities/actions";
import { getStaffAccountAction } from "@/domains/staff-accounts/actions";
import { ROLE_LABELS } from "@/shared/domain/labels";
import { DetailPage } from "@/shared/ui/layouts";

import { PasswordResetButton } from "../PasswordResetButton";

export default async function StaffAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [account, facilities] = await Promise.all([
    getStaffAccountAction(id),
    listFacilitiesAction(),
  ]);

  if (!account) {
    notFound();
  }

  const facilityNames = new Map(facilities.map((f) => [f.id, f.name]));

  return (
    <DetailPage
      title={account.displayName}
      subtitle="職員アカウント詳細"
      actions={
        <div className="flex gap-2">
          <Link
            href={`/staff-accounts/${id}/edit`}
            className="inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            編集
          </Link>
          <PasswordResetButton staffAccountId={id} />
        </div>
      }
    >
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted-foreground">従業員 ID</dt>
          <dd>{account.loginId}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">メール</dt>
          <dd>{account.email}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">役割</dt>
          <dd>{ROLE_LABELS[account.role]}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">状態</dt>
          <dd>{account.isActive ? "有効" : "停止"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-sm text-muted-foreground">所属施設</dt>
          <dd>
            {account.facilityIds
              .map((facilityId) => facilityNames.get(facilityId) ?? facilityId)
              .join("、")}
          </dd>
        </div>
      </dl>
    </DetailPage>
  );
}
