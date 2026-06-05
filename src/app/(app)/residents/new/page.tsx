import { listAccessibleFacilitiesAction } from "@/domains/residents/actions";
import { CreatePage } from "@/shared/ui/layouts";

import { ResidentForm } from "../ResidentForm";

export default async function NewResidentPage() {
  const facilities = await listAccessibleFacilitiesAction();

  return (
    <CreatePage
      title="利用者の新規登録"
      cancelHref="/residents"
      formChildren={<ResidentForm mode="create" facilities={facilities} />}
    />
  );
}
