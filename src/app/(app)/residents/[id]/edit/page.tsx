import { notFound } from "next/navigation";

import {
  getResidentAction,
  listAccessibleFacilitiesAction,
} from "@/domains/residents/actions";
import { EditPage } from "@/shared/ui/layouts";

import { ResidentForm } from "../../ResidentForm";

function toDateInput(date: Date | null): string {
  if (!date) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}

export default async function EditResidentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [resident, facilities] = await Promise.all([
    getResidentAction(id),
    listAccessibleFacilitiesAction(),
  ]);

  if (!resident) {
    notFound();
  }

  return (
    <EditPage
      title={`${resident.name} の編集`}
      cancelHref={`/residents/${id}`}
      formChildren={
        <ResidentForm
          mode="edit"
          residentId={id}
          facilities={facilities}
          defaultValues={{
            facilityId: resident.facilityId,
            name: resident.name,
            nameKana: resident.nameKana,
            birthDate: toDateInput(resident.birthDate),
            gender: resident.gender,
            address: resident.address ?? "",
            phone: resident.phone ?? "",
            mobile: resident.mobile ?? "",
            moveInDate: toDateInput(resident.moveInDate),
            moveOutDate: toDateInput(resident.moveOutDate),
            usageStatus: resident.usageStatus,
          }}
        />
      }
    />
  );
}
