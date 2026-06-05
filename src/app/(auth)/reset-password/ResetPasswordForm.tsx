"use client";

import { completePasswordResetAction } from "@/domains/auth/actions";
import { Field, Form, type FormActionResult } from "@/shared/ui/form";

async function resetAction(formData: FormData): Promise<FormActionResult> {
  const result = await completePasswordResetAction(undefined, formData);
  if (result.ok) {
    return { ok: true };
  }
  return { ok: false, errors: result.errors };
}

export function ResetPasswordForm() {
  return (
    <Form action={resetAction} submitLabel="パスワードを更新">
      <Field
        name="password"
        label="新しいパスワード"
        required
        helperText="8文字で設定してください"
      >
        <input
          autoComplete="new-password"
          className="w-full rounded-md border border-muted-foreground/30 bg-background px-3 py-2 text-sm"
          minLength={8}
          maxLength={8}
          name="password"
          required
          type="password"
        />
      </Field>
      <Field name="passwordConfirm" label="新しいパスワード（確認）" required>
        <input
          autoComplete="new-password"
          className="w-full rounded-md border border-muted-foreground/30 bg-background px-3 py-2 text-sm"
          minLength={8}
          maxLength={8}
          name="passwordConfirm"
          required
          type="password"
        />
      </Field>
    </Form>
  );
}
