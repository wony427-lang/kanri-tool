"use client";

import { signInAction } from "@/domains/auth/actions";
import { Field, Form, type FormActionResult } from "@/shared/ui/form";

async function loginAction(formData: FormData): Promise<FormActionResult> {
  const result = await signInAction(undefined, formData);
  if (result.ok) {
    return { ok: true };
  }
  return { ok: false, errors: result.errors };
}

export function LoginForm() {
  return (
    <Form action={loginAction} submitLabel="ログイン" successMessage="">
      <Field name="loginId" label="従業員 ID" required>
        <input
          autoComplete="username"
          className="w-full rounded-md border border-muted-foreground/30 bg-background px-3 py-2 text-sm"
          name="loginId"
          required
        />
      </Field>
      <Field name="password" label="パスワード" required>
        <input
          autoComplete="current-password"
          className="w-full rounded-md border border-muted-foreground/30 bg-background px-3 py-2 text-sm"
          name="password"
          required
          type="password"
        />
      </Field>
    </Form>
  );
}
