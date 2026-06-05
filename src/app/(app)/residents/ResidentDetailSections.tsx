"use client";

import { useState, useTransition } from "react";

import { deleteResidentAction } from "@/domains/residents/actions";
import {
  updateEmergencyContactsAction,
  updateMedicalCareAction,
  updateMedicalHistoryAction,
} from "@/domains/medical-care/actions";
import { Field } from "@/shared/ui/form/Field";
import { Form } from "@/shared/ui/form/Form";
import { Button } from "@/shared/ui/primitives/button";
import { ConfirmDialog } from "@/shared/ui/primitives/confirm-dialog";
import { Input } from "@/shared/ui/primitives/input";
import { useToast } from "@/shared/ui/primitives/toast";
import type { ResidentDetail } from "@/domains/residents/types";

function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-muted-foreground/20 pt-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function ResidentDetailSections({
  resident,
  canEdit,
  canDelete,
}: {
  resident: ResidentDetail;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const { showToast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, startDelete] = useTransition();

  const contact1 = resident.emergencyContacts.find((c) => c.sortOrder === 1);
  const contact2 = resident.emergencyContacts.find((c) => c.sortOrder === 2);

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteResidentAction(resident.id);
      if (!result.ok) {
        showToast({ message: result.message, variant: "error" });
        setDeleteOpen(false);
      }
    });
  }

  if (!canEdit) {
    return null;
  }

  return (
    <>
      <SubSection title="医療機関・ケアマネ">
        <Form
          action={(formData) => updateMedicalCareAction(resident.id, formData)}
          submitLabel="医療・ケア情報を保存"
          successMessage="医療・ケア情報を保存しました"
        >
          <Field name="medicalFacilityName" label="医療機関名">
            <Input
              name="medicalFacilityName"
              defaultValue={resident.medicalCare?.medicalFacilityName ?? ""}
            />
          </Field>
          <Field name="primaryDoctor" label="主治医">
            <Input
              name="primaryDoctor"
              defaultValue={resident.medicalCare?.primaryDoctor ?? ""}
            />
          </Field>
          <Field name="emergencyHospital" label="緊急時受入病院 ①">
            <Input
              name="emergencyHospital"
              defaultValue={resident.medicalCare?.emergencyHospital ?? ""}
            />
          </Field>
          <Field name="emergencyHospital2" label="緊急時受入病院 ②">
            <Input
              name="emergencyHospital2"
              defaultValue={resident.medicalCare?.emergencyHospital2 ?? ""}
            />
          </Field>
          <Field name="careOffice" label="居宅介護支援事業所">
            <Input
              name="careOffice"
              defaultValue={resident.medicalCare?.careOffice ?? ""}
            />
          </Field>
          <Field name="careOfficePhone" label="居宅介護支援事業所 TEL">
            <Input
              name="careOfficePhone"
              defaultValue={resident.medicalCare?.careOfficePhone ?? ""}
            />
          </Field>
          <Field name="careOfficeLicenseNo" label="事業所番号">
            <Input
              name="careOfficeLicenseNo"
              defaultValue={resident.medicalCare?.careOfficeLicenseNo ?? ""}
            />
          </Field>
          <Field name="careManagerName" label="担当ケアマネ">
            <Input
              name="careManagerName"
              defaultValue={resident.medicalCare?.careManagerName ?? ""}
            />
          </Field>
        </Form>
      </SubSection>

      <SubSection title="緊急連絡先">
        <Form
          action={(formData) =>
            updateEmergencyContactsAction(resident.id, formData)
          }
          submitLabel="緊急連絡先を保存"
          successMessage="緊急連絡先を保存しました"
        >
          <p className="text-sm font-medium">連絡先 1</p>
          <Field name="contact1Name" label="氏名">
            <Input name="contact1Name" defaultValue={contact1?.name ?? ""} />
          </Field>
          <Field name="contact1Relationship" label="続柄">
            <Input
              name="contact1Relationship"
              defaultValue={contact1?.relationship ?? ""}
            />
          </Field>
          <Field name="contact1Phone" label="電話番号">
            <Input name="contact1Phone" defaultValue={contact1?.phone ?? ""} />
          </Field>
          <Field name="contact1Mobile" label="携帯番号">
            <Input name="contact1Mobile" defaultValue={contact1?.mobile ?? ""} />
          </Field>
          <Field name="contact1Address" label="住所">
            <Input name="contact1Address" defaultValue={contact1?.address ?? ""} />
          </Field>

          <p className="text-sm font-medium">連絡先 2</p>
          <Field name="contact2Name" label="氏名">
            <Input name="contact2Name" defaultValue={contact2?.name ?? ""} />
          </Field>
          <Field name="contact2Relationship" label="続柄">
            <Input
              name="contact2Relationship"
              defaultValue={contact2?.relationship ?? ""}
            />
          </Field>
          <Field name="contact2Phone" label="電話番号">
            <Input name="contact2Phone" defaultValue={contact2?.phone ?? ""} />
          </Field>
          <Field name="contact2Mobile" label="携帯番号">
            <Input name="contact2Mobile" defaultValue={contact2?.mobile ?? ""} />
          </Field>
          <Field name="contact2Address" label="住所">
            <Input name="contact2Address" defaultValue={contact2?.address ?? ""} />
          </Field>
        </Form>
      </SubSection>

      <SubSection title="病歴・備考">
        <Form
          action={(formData) =>
            updateMedicalHistoryAction(resident.id, formData)
          }
          submitLabel="病歴・備考を保存"
          successMessage="病歴・備考を保存しました"
        >
          <Field name="medicalHistory" label="病歴">
            <textarea
              name="medicalHistory"
              rows={4}
              defaultValue={resident.medicalHistory ?? ""}
              className="w-full rounded-md border border-muted-foreground/30 px-3 py-2 text-sm"
            />
          </Field>
          <Field name="notes" label="備考">
            <textarea
              name="notes"
              rows={4}
              defaultValue={resident.notes ?? ""}
              className="w-full rounded-md border border-muted-foreground/30 px-3 py-2 text-sm"
            />
          </Field>
        </Form>
      </SubSection>

      {canDelete ? (
        <div className="border-t border-muted-foreground/20 pt-6">
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={() => setDeleteOpen(true)}
          >
            利用者を削除
          </Button>
          <ConfirmDialog
            open={deleteOpen}
            title="利用者の削除"
            description={`${resident.name} を削除します。この操作は取り消せません。`}
            confirmLabel="削除する"
            onConfirm={handleDelete}
            onCancel={() => setDeleteOpen(false)}
          />
        </div>
      ) : null}
    </>
  );
}
