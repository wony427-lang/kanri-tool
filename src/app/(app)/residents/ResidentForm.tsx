"use client";

import { useState } from "react";

import {
  createResidentAction,
  updateResidentAction,
} from "@/domains/residents/actions";
import { USAGE_STATUS_LABELS } from "@/shared/domain/labels";
import { Field } from "@/shared/ui/form/Field";
import { Form } from "@/shared/ui/form/Form";
import { Input } from "@/shared/ui/primitives/input";

interface FacilityOption {
  id: string;
  name: string;
}

export function ResidentForm({
  mode,
  residentId,
  facilities,
  defaultValues,
}: {
  mode: "create" | "edit";
  residentId?: string;
  facilities: FacilityOption[];
  defaultValues?: {
    facilityId: string;
    name: string;
    nameKana: string;
    birthDate: string;
    gender: string;
    address: string;
    phone: string;
    mobile: string;
    moveInDate: string;
    moveOutDate: string;
    usageStatus: string;
  };
}) {
  const [usageStatus, setUsageStatus] = useState(
    defaultValues?.usageStatus ?? "active",
  );
  const moveOutRequired = usageStatus === "discharged";

  const action =
    mode === "create"
      ? createResidentAction
      : (formData: FormData) => updateResidentAction(residentId!, formData);

  return (
    <Form
      action={action}
      submitLabel={mode === "create" ? "登録" : "保存"}
      cancelHref={
        mode === "create" ? "/residents" : `/residents/${residentId}`
      }
    >
      <Field name="facilityId" label="所属施設" required>
        <select
          name="facilityId"
          defaultValue={defaultValues?.facilityId ?? facilities[0]?.id}
          className="w-full rounded-md border border-muted-foreground/30 bg-background px-3 py-2 text-sm"
          required
        >
          {facilities.map((facility) => (
            <option key={facility.id} value={facility.id}>
              {facility.name}
            </option>
          ))}
        </select>
      </Field>
      <Field name="name" label="利用者氏名" required>
        <Input name="name" defaultValue={defaultValues?.name ?? ""} required />
      </Field>
      <Field name="nameKana" label="フリガナ" required>
        <Input
          name="nameKana"
          defaultValue={defaultValues?.nameKana ?? ""}
          required
        />
      </Field>
      <Field name="birthDate" label="生年月日" required>
        <Input
          name="birthDate"
          type="date"
          defaultValue={defaultValues?.birthDate ?? ""}
          required
        />
      </Field>
      <Field name="gender" label="性別" required>
        <Input name="gender" defaultValue={defaultValues?.gender ?? ""} required />
      </Field>
      <Field name="usageStatus" label="利用状況" required>
        <select
          name="usageStatus"
          value={usageStatus}
          onChange={(event) => setUsageStatus(event.target.value)}
          className="w-full rounded-md border border-muted-foreground/30 bg-background px-3 py-2 text-sm"
          required
        >
          {Object.entries(USAGE_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field name="moveInDate" label="入居日">
        <Input
          name="moveInDate"
          type="date"
          defaultValue={defaultValues?.moveInDate ?? ""}
        />
      </Field>
      <Field name="moveOutDate" label="退去日" required={moveOutRequired}>
        <Input
          name="moveOutDate"
          type="date"
          defaultValue={defaultValues?.moveOutDate ?? ""}
          required={moveOutRequired}
        />
      </Field>
      <Field name="address" label="住所">
        <Input name="address" defaultValue={defaultValues?.address ?? ""} />
      </Field>
      <Field name="phone" label="電話番号">
        <Input name="phone" defaultValue={defaultValues?.phone ?? ""} />
      </Field>
      <Field name="mobile" label="携帯番号">
        <Input name="mobile" defaultValue={defaultValues?.mobile ?? ""} />
      </Field>
    </Form>
  );
}
