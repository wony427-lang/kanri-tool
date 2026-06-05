import { listFacilitiesAction } from "@/domains/facilities/actions";
import { CreatePage } from "@/shared/ui/layouts";

import { StaffAccountForm } from "../StaffAccountForm";

export default async function NewStaffAccountPage() {
  const facilities = await listFacilitiesAction();

  return (
    <CreatePage
      title="職員の新規登録"
      cancelHref="/staff-accounts"
      formChildren={
        <StaffAccountForm
          mode="create"
          facilities={facilities.filter((f) => f.isActive)}
        />
      }
    />
  );
}
