"use client";

import { useState, useTransition } from "react";

import {
  addVendorKeyAction,
  deleteVendorKeyAction,
  updateVendorKeyAction,
} from "@/domains/external-vendors/actions";
import type { ExternalVendorKeyDetail } from "@/domains/external-vendors/types";
import { VENDOR_TYPE_LABELS } from "@/shared/domain/labels";
import { maskSecretValue } from "@/shared/domain/mask";
import { Field } from "@/shared/ui/form/Field";
import { Form } from "@/shared/ui/form/Form";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { useToast } from "@/shared/ui/primitives/toast";

function MaskedUniqueKey({ value }: { value: string }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <code className="rounded bg-muted px-2 py-1 text-sm">
        {revealed ? value : maskSecretValue(value)}
      </code>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setRevealed((current) => !current)}
      >
        {revealed ? "隠す" : "表示"}
      </Button>
    </div>
  );
}

function VendorTypeSelect({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? "medical"}
      className="w-full rounded-md border border-muted-foreground/30 bg-background px-3 py-2 text-sm"
      required
    >
      {Object.entries(VENDOR_TYPE_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function ResidentExternalVendorForms({
  residentId,
  vendorKeys,
  canEdit,
}: {
  residentId: string;
  vendorKeys: ExternalVendorKeyDetail[];
  canEdit: boolean;
}) {
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <section
      id="external-vendors"
      className="flex flex-col gap-4 border-t border-muted-foreground/20 pt-6 scroll-mt-32"
    >
      <h2 className="text-lg font-semibold">外部業者連携キー</h2>

      {vendorKeys.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          登録されている連携キーはありません
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {vendorKeys.map((vendorKey) => (
            <li
              key={vendorKey.id}
              className="rounded-md border border-muted-foreground/20 p-4"
            >
              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <span className="text-sm text-muted-foreground">業者種別</span>
                  <p className="font-medium">
                    {VENDOR_TYPE_LABELS[vendorKey.vendorType]}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">業者名</span>
                  <p className="font-medium">{vendorKey.vendorName}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-sm text-muted-foreground">
                    ユニークキー
                  </span>
                  <MaskedUniqueKey value={vendorKey.uniqueKey} />
                </div>
                {vendorKey.notes ? (
                  <div className="sm:col-span-2">
                    <span className="text-sm text-muted-foreground">備考</span>
                    <p className="text-sm">{vendorKey.notes}</p>
                  </div>
                ) : null}
              </div>

              {canEdit ? (
                <>
                  <Form
                    action={(formData) =>
                      updateVendorKeyAction(
                        residentId,
                        vendorKey.id,
                        formData,
                      )
                    }
                    submitLabel="更新"
                    successMessage="連携キーを更新しました"
                  >
                    <Field name="vendorType" label="業者種別" required>
                      <VendorTypeSelect
                        name="vendorType"
                        defaultValue={vendorKey.vendorType}
                      />
                    </Field>
                    <Field name="vendorName" label="業者名" required>
                      <Input
                        name="vendorName"
                        defaultValue={vendorKey.vendorName}
                        required
                      />
                    </Field>
                    <Field name="uniqueKey" label="ユニークキー" required>
                      <Input
                        name="uniqueKey"
                        defaultValue={vendorKey.uniqueKey}
                        required
                      />
                    </Field>
                    <Field name="notes" label="備考">
                      <Input
                        name="notes"
                        defaultValue={vendorKey.notes ?? ""}
                      />
                    </Field>
                  </Form>
                  <Button
                    type="button"
                    variant="destructive"
                    className="mt-2"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await deleteVendorKeyAction(
                          residentId,
                          vendorKey.id,
                        );
                        if (result.ok) {
                          showToast({
                            message: "連携キーを削除しました",
                            variant: "success",
                          });
                        } else {
                          showToast({
                            message: result.message,
                            variant: "error",
                          });
                        }
                      })
                    }
                  >
                    削除
                  </Button>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canEdit ? (
        <Form
          action={(formData) => addVendorKeyAction(residentId, formData)}
          submitLabel="連携キーを追加"
          successMessage="連携キーを追加しました"
        >
          <Field name="vendorType" label="業者種別" required>
            <VendorTypeSelect name="vendorType" />
          </Field>
          <Field name="vendorName" label="業者名" required>
            <Input name="vendorName" required />
          </Field>
          <Field name="uniqueKey" label="ユニークキー" required>
            <Input name="uniqueKey" required />
          </Field>
          <Field name="notes" label="備考">
            <Input name="notes" />
          </Field>
        </Form>
      ) : null}
    </section>
  );
}
