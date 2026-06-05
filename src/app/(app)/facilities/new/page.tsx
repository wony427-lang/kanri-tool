import { CreatePage } from "@/shared/ui/layouts";

import { FacilityForm } from "../FacilityForm";

export default function NewFacilityPage() {
  return (
    <CreatePage
      title="施設の新規登録"
      cancelHref="/facilities"
      formChildren={<FacilityForm mode="create" />}
    />
  );
}
