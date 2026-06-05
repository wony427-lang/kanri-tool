"use client";

import {
  createStaffAccountAction,
  updateStaffAccountAction,
} from "@/domains/staff-accounts/actions";
import { ROLE_LABELS } from "@/shared/domain/labels";
import { Field, RequiredMark } from "@/shared/ui/form";
import { Form } from "@/shared/ui/form/Form";
import { Input } from "@/shared/ui/primitives/input";

interface FacilityOption {
  id: string;
  name: string;
}

export function StaffAccountForm({
  mode,
  staffAccountId,
  facilities,
  defaultValues,
}: {
  mode: "create" | "edit";
  staffAccountId?: string;
  facilities: FacilityOption[];
  defaultValues?: {
    displayName: string;
    loginId: string;
    email: string;
    role: "admin" | "staff" | "viewer";
    facilityIds: string[];
    isActive: boolean;
  };
}) {
  const action =
    mode === "create"
      ? createStaffAccountAction
      : (formData: FormData) =>
          updateStaffAccountAction(staffAccountId!, formData);

  return (
    <Form
      action={action}
      submitLabel={mode === "create" ? "登録" : "保存"}
      cancelHref={
        mode === "create"
          ? "/staff-accounts"
          : `/staff-accounts/${staffAccountId}`
      }
    >
      <Field name="displayName" label="表示名" required>
        <Input
          name="displayName"
          defaultValue={defaultValues?.displayName ?? ""}
          required
        />
      </Field>
      <Field
        name="loginId"
        label="従業員 ID"
        required
        helperText={
          mode === "create"
            ? "管理者がログイン用の従業員 ID を指定します（英数字・._-）"
            : undefined
        }
      >
        <Input
          name="loginId"
          defaultValue={defaultValues?.loginId ?? ""}
          required
          readOnly={mode === "edit"}
        />
      </Field>
      <Field name="email" label="メールアドレス" required>
        <Input
          name="email"
          type="email"
          defaultValue={defaultValues?.email ?? ""}
          required
        />
      </Field>
      {mode === "create" ? (
        <Field
          name="password"
          label="初期パスワード"
          required
          helperText="8文字で設定してください"
        >
          <Input
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={8}
          />
        </Field>
      ) : null}
      <Field name="role" label="役割" required>
        <select
          name="role"
          defaultValue={defaultValues?.role ?? "staff"}
          className="rounded-md border border-muted-foreground/30 bg-background px-3 py-2 text-sm"
        >
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">
          所属施設
          <RequiredMark />
        </legend>
        {facilities.map((facility) => (
          <label key={facility.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="facilityIds"
              value={facility.id}
              defaultChecked={defaultValues?.facilityIds.includes(facility.id)}
            />
            {facility.name}
          </label>
        ))}
      </fieldset>
      {mode === "edit" ? (
        <Field name="isActive" label="利用状態">
          <select
            name="isActive"
            defaultValue={defaultValues?.isActive ? "true" : "false"}
            className="rounded-md border border-muted-foreground/30 bg-background px-3 py-2 text-sm"
          >
            <option value="true">有効</option>
            <option value="false">停止</option>
          </select>
        </Field>
      ) : null}
    </Form>
  );
}
