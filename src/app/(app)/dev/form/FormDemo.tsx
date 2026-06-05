"use client";

import { Field, Form, type FormActionResult } from "@/shared/ui/form";

type DemoMode = "success" | "field-error" | "form-error" | "slow";

export function FormDemo() {
  async function mockAction(formData: FormData): Promise<FormActionResult> {
    const mode = formData.get("_mode") as DemoMode;
    const name = String(formData.get("name") ?? "");

    if (mode === "slow") {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    if (mode === "field-error") {
      return { ok: false, errors: { fields: { name: "氏名は必須です" } } };
    }

    if (mode === "form-error") {
      return { ok: false, errors: { form: "保存に失敗しました" } };
    }

    if (!name.trim()) {
      return { ok: false, errors: { fields: { name: "氏名は必須です" } } };
    }

    return { ok: true };
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Form デモ</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          モック Server Action で検証エラー・送信中・成功・失敗を確認できます。
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {(
          [
            ["success", "成功"],
            ["field-error", "フィールドエラー"],
            ["form-error", "フォームエラー"],
            ["slow", "送信遅延"],
          ] as const
        ).map(([mode, label]) => (
          <section
            key={mode}
            className="rounded-lg border border-muted-foreground/20 bg-background p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold">{label}</h2>
            <div className="mt-4">
              <Form
                action={mockAction}
                submitLabel="保存"
                successMessage="保存しました"
                cancelHref="/dev"
              >
                <input type="hidden" name="_mode" value={mode} />
                <Field name="name" label="氏名" helperText="全角で入力してください">
                  <input
                    className="w-full rounded-md border border-muted-foreground/30 bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    name="name"
                    defaultValue=""
                  />
                </Field>
              </Form>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
