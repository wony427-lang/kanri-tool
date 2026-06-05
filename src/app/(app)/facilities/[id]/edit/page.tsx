import { notFound } from "next/navigation";

import { getFacilityAction } from "@/domains/facilities/actions";
import { EditPage } from "@/shared/ui/layouts";

import { FacilityForm } from "../../FacilityForm";

export default async function EditFacilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const facility = await getFacilityAction(id);
  if (!facility) {
    notFound();
  }

  return (
    <EditPage
      title={`${facility.name} の編集`}
      cancelHref={`/facilities/${id}`}
      formChildren={
        <FacilityForm
          mode="edit"
          facilityId={id}
          defaultValues={{
            name: facility.name,
            isActive: facility.isActive,
          }}
        />
      }
    />
  );
}
