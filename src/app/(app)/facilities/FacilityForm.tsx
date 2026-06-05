"use client";

import {
  createFacilityAction,
  updateFacilityAction,
} from "@/domains/facilities/actions";
import { Field } from "@/shared/ui/form/Field";
import { Form } from "@/shared/ui/form/Form";
import { Input } from "@/shared/ui/primitives/input";
import Link from "next/link";

export function FacilityForm({
  mode,
  facilityId,
  defaultValues,
}: {
  mode: "create" | "edit";
  facilityId?: string;
  defaultValues?: { name: string; isActive: boolean };
}) {
  const action =
    mode === "create"
      ? createFacilityAction
      : (formData: FormData) => updateFacilityAction(facilityId!, formData);

  return (
    <Form
      action={action}
      submitLabel={mode === "create" ? "登録" : "保存"}
      cancelHref={
        mode === "create" ? "/facilities" : `/facilities/${facilityId}`
      }
      successMessage={
        mode === "create" ? "施設を登録しました" : "施設を更新しました"
      }
    >
      <Field name="name" label="施設名" required>
        <Input name="name" defaultValue={defaultValues?.name ?? ""} required />
      </Field>
      {mode === "edit" ? (
        <Field name="isActive" label="利用状態">
          <select
            name="isActive"
            defaultValue={defaultValues?.isActive ? "true" : "false"}
            className="rounded-md border border-muted-foreground/30 bg-background px-3 py-2 text-sm"
          >
            <option value="true">利用中</option>
            <option value="false">利用停止</option>
          </select>
        </Field>
      ) : null}
    </Form>
  );
}

export function FacilityListActions() {
  return (
    <Link
      href="/facilities/new"
      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
    >
      新規施設
    </Link>
  );
}
