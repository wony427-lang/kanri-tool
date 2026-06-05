import { notFound } from "next/navigation";

import { listFacilitiesAction } from "@/domains/facilities/actions";
import { getStaffAccountAction } from "@/domains/staff-accounts/actions";
import { EditPage } from "@/shared/ui/layouts";

import { StaffAccountForm } from "../../StaffAccountForm";

export default async function EditStaffAccountPage({
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

  return (
    <EditPage
      title={`${account.displayName} の編集`}
      cancelHref={`/staff-accounts/${id}`}
      formChildren={
        <StaffAccountForm
          mode="edit"
          staffAccountId={id}
          facilities={facilities.filter((f) => f.isActive)}
          defaultValues={{
            displayName: account.displayName,
            loginId: account.loginId,
            email: account.email,
            role: account.role,
            facilityIds: account.facilityIds,
            isActive: account.isActive,
          }}
        />
      }
    />
  );
}
