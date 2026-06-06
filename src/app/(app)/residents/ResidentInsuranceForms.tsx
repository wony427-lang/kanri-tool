"use client";

import { useState, useTransition } from "react";

import {
  addPublicExpenseAction,
  removePublicExpenseAction,
  updateCareInsuranceAction,
  updateDisabilityWelfareAction,
  updateMedicalInsuranceAction,
  updatePublicExpenseAction,
} from "@/domains/insurance/actions";
import {
  markBilledAction,
  markPaidAction,
  updateComprehensiveInsuranceAction,
} from "@/domains/comprehensive-insurance/actions";
import type {
  ComprehensiveInsuranceDetail,
  ComprehensiveInsuranceHistoryItem,
} from "@/domains/comprehensive-insurance/types";
import type {
  CareInsuranceDetail,
  DisabilityWelfareDetail,
  MedicalInsuranceDetail,
  PublicExpenseDetail,
} from "@/domains/insurance/types";
import {
  BILLING_STATUS_LABELS,
  CARE_LEVEL_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/shared/domain/labels";
import { Field } from "@/shared/ui/form/Field";
import { Form } from "@/shared/ui/form/Form";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { useToast } from "@/shared/ui/primitives/toast";

function toDateInput(date: Date | null | undefined): string {
  if (!date) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}

function SubSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="flex flex-col gap-4 border-t border-muted-foreground/20 pt-6 scroll-mt-32"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function ResidentInsuranceForms({
  residentId,
  canEdit,
  canUpdateCiStatus,
  care,
  medical,
  disability,
  publicExpenses,
  comprehensive,
  history,
}: {
  residentId: string;
  canEdit: boolean;
  canUpdateCiStatus: boolean;
  care: CareInsuranceDetail | null;
  medical: MedicalInsuranceDetail | null;
  disability: DisabilityWelfareDetail | null;
  publicExpenses: PublicExpenseDetail[];
  comprehensive: ComprehensiveInsuranceDetail | null;
  history: ComprehensiveInsuranceHistoryItem[];
}) {
  const { showToast } = useToast();
  const [enrolled, setEnrolled] = useState(comprehensive?.enrolled ?? false);
  const [pending, startTransition] = useTransition();

  if (!canEdit) {
    return null;
  }

  function handleCiStatus(
    action: "billed" | "paid",
    recordId: string | undefined,
  ) {
    if (!recordId) {
      return;
    }
    startTransition(async () => {
      const result =
        action === "billed"
          ? await markBilledAction(recordId)
          : await markPaidAction(recordId);
      if (result.ok) {
        showToast({ message: "状態を更新しました", variant: "success" });
      } else {
        showToast({ message: result.message, variant: "error" });
      }
    });
  }

  return (
    <>
      <SubSection id="care-insurance" title="介護保険">
        <Form
          action={(formData) => updateCareInsuranceAction(residentId, formData)}
          submitLabel="介護保険を保存"
          successMessage="介護保険を保存しました"
        >
          <Field name="insurerNo" label="保険者番号（6桁）">
            <Input name="insurerNo" defaultValue={care?.insurerNo ?? ""} />
          </Field>
          <Field name="insuredNo" label="被保険者番号（10桁）">
            <Input name="insuredNo" defaultValue={care?.insuredNo ?? ""} />
          </Field>
          <Field name="careLevel" label="要介護度">
            <select
              name="careLevel"
              defaultValue={care?.careLevel ?? ""}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">未選択</option>
              {Object.entries(CARE_LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field name="certificationDate" label="認定日">
            <Input
              name="certificationDate"
              type="date"
              defaultValue={toDateInput(care?.certificationDate)}
            />
          </Field>
          <Field name="periodStart" label="認定有効期間（開始）">
            <Input
              name="periodStart"
              type="date"
              defaultValue={toDateInput(care?.periodStart)}
            />
          </Field>
          <Field name="periodEnd" label="認定有効期間（終了）">
            <Input
              name="periodEnd"
              type="date"
              defaultValue={toDateInput(care?.periodEnd)}
            />
          </Field>
          <Field name="burdenRatio" label="負担割合（1/2/3割）">
            <Input
              name="burdenRatio"
              type="number"
              min={1}
              max={3}
              defaultValue={care?.burdenRatio ?? ""}
            />
          </Field>
          <Field name="burdenRatioExpiresAt" label="負担割合証 有効期限">
            <Input
              name="burdenRatioExpiresAt"
              type="date"
              defaultValue={toDateInput(care?.burdenRatioExpiresAt)}
            />
          </Field>
        </Form>
      </SubSection>

      <SubSection id="medical-insurance" title="医療保険">
        <Form
          action={(formData) =>
            updateMedicalInsuranceAction(residentId, formData)
          }
          submitLabel="医療保険を保存"
          successMessage="医療保険を保存しました"
        >
          <Field name="insurerNo" label="保険者番号（6〜8桁）">
            <Input name="insurerNo" defaultValue={medical?.insurerNo ?? ""} />
          </Field>
          <Field name="insuredNo" label="被保険者番号">
            <Input name="insuredNo" defaultValue={medical?.insuredNo ?? ""} />
          </Field>
          <Field name="expiresAt" label="有効期限">
            <Input
              name="expiresAt"
              type="date"
              defaultValue={toDateInput(medical?.expiresAt)}
            />
          </Field>
        </Form>
      </SubSection>

      <SubSection id="disability-welfare" title="障害福祉情報">
        <Form
          action={(formData) =>
            updateDisabilityWelfareAction(residentId, formData)
          }
          submitLabel="障害福祉情報を保存"
          successMessage="障害福祉情報を保存しました"
        >
          <Field name="recipientNo" label="受給者証番号（10桁）">
            <Input
              name="recipientNo"
              defaultValue={disability?.recipientNo ?? ""}
            />
          </Field>
          <Field name="supportLevel" label="障害支援区分">
            <Input
              name="supportLevel"
              defaultValue={disability?.supportLevel ?? ""}
            />
          </Field>
          <Field name="serviceType" label="サービス種別">
            <Input
              name="serviceType"
              defaultValue={disability?.serviceType ?? ""}
            />
          </Field>
          <Field name="periodStart" label="支給決定期間（開始）">
            <Input
              name="periodStart"
              type="date"
              defaultValue={toDateInput(disability?.periodStart)}
            />
          </Field>
          <Field name="periodEnd" label="支給決定期間（終了）">
            <Input
              name="periodEnd"
              type="date"
              defaultValue={toDateInput(disability?.periodEnd)}
            />
          </Field>
          <Field name="serviceQuantity" label="支給量">
            <Input
              name="serviceQuantity"
              defaultValue={disability?.serviceQuantity ?? ""}
            />
          </Field>
        </Form>
      </SubSection>

      <SubSection id="public-expense" title="公費情報">
        {publicExpenses.map((expense) => (
          <div
            key={expense.id}
            className="mb-4 rounded-md border border-muted-foreground/20 p-4"
          >
            <Form
              action={(formData) =>
                updatePublicExpenseAction(residentId, expense.id, formData)
              }
              submitLabel="更新"
              successMessage="公費情報を更新しました"
            >
              <Field name="kind" label="公費種別" required>
                <Input name="kind" defaultValue={expense.kind} required />
              </Field>
              <Field name="payerNo" label="負担者番号（8桁）">
                <Input name="payerNo" defaultValue={expense.payerNo ?? ""} />
              </Field>
              <Field name="recipientNo" label="受給者番号（7桁）">
                <Input
                  name="recipientNo"
                  defaultValue={expense.recipientNo ?? ""}
                />
              </Field>
              <Field name="selfBurden" label="本人負担額">
                <Input
                  name="selfBurden"
                  type="number"
                  defaultValue={expense.selfBurden ?? ""}
                />
              </Field>
              <Field name="expiresAt" label="有効期限">
                <Input
                  name="expiresAt"
                  type="date"
                  defaultValue={toDateInput(expense.expiresAt)}
                />
              </Field>
            </Form>
            <Button
              type="button"
              variant="destructive"
              className="mt-2"
              onClick={() =>
                startTransition(async () => {
                  const result = await removePublicExpenseAction(
                    residentId,
                    expense.id,
                  );
                  if (result.ok) {
                    showToast({ message: "削除しました", variant: "success" });
                  } else {
                    showToast({ message: result.message, variant: "error" });
                  }
                })
              }
            >
              削除
            </Button>
          </div>
        ))}
        <Form
          action={(formData) => addPublicExpenseAction(residentId, formData)}
          submitLabel="公費を追加"
          successMessage="公費情報を追加しました"
        >
          <Field name="kind" label="公費種別" required>
            <Input name="kind" required />
          </Field>
          <Field name="payerNo" label="負担者番号（8桁）">
            <Input name="payerNo" />
          </Field>
          <Field name="recipientNo" label="受給者番号（7桁）">
            <Input name="recipientNo" />
          </Field>
          <Field name="selfBurden" label="本人負担額">
            <Input name="selfBurden" type="number" />
          </Field>
          <Field name="expiresAt" label="有効期限">
            <Input name="expiresAt" type="date" />
          </Field>
        </Form>
      </SubSection>

      <SubSection id="comprehensive-insurance" title="利用者総合保険">
        <Form
          action={(formData) =>
            updateComprehensiveInsuranceAction(residentId, formData)
          }
          submitLabel="利用者総合保険を保存"
          successMessage="利用者総合保険を保存しました"
        >
          <Field name="enrolled" label="加入有無">
            <select
              name="enrolled"
              value={enrolled ? "true" : "false"}
              onChange={(event) => setEnrolled(event.target.value === "true")}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="true">加入</option>
              <option value="false">未加入</option>
            </select>
          </Field>
          <Field name="insurerName" label="保険会社">
            <Input
              name="insurerName"
              defaultValue={comprehensive?.insurerName ?? ""}
              disabled={!enrolled}
            />
          </Field>
          <Field name="policyNo" label="証券番号">
            <Input
              name="policyNo"
              defaultValue={comprehensive?.policyNo ?? ""}
              disabled={!enrolled}
            />
          </Field>
          <Field name="joinedAt" label="加入日">
            <Input
              name="joinedAt"
              type="date"
              defaultValue={toDateInput(comprehensive?.joinedAt)}
              disabled={!enrolled}
            />
          </Field>
          <Field name="startDate" label="保険開始日" required={enrolled}>
            <Input
              name="startDate"
              type="date"
              defaultValue={toDateInput(comprehensive?.startDate)}
              disabled={!enrolled}
              required={enrolled}
            />
          </Field>
          <Field name="endDate" label="保険終了日">
            <Input
              name="endDate"
              type="date"
              defaultValue={toDateInput(comprehensive?.endDate)}
              disabled={!enrolled}
            />
          </Field>
          <Field name="annualPremium" label="年間保険料">
            <Input
              name="annualPremium"
              type="number"
              defaultValue={comprehensive?.annualPremium ?? ""}
              disabled={!enrolled}
            />
          </Field>
          <Field name="notes" label="備考">
            <textarea
              name="notes"
              rows={3}
              defaultValue={comprehensive?.notes ?? ""}
              disabled={!enrolled}
              className="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
            />
          </Field>
        </Form>

        {comprehensive?.enrolled ? (
          <div className="flex flex-wrap gap-2 text-sm">
            <span>
              請求: {BILLING_STATUS_LABELS[comprehensive.billingStatus]}
            </span>
            <span>
              入金: {PAYMENT_STATUS_LABELS[comprehensive.paymentStatus]}
            </span>
            <span>
              次回請求予定日:{" "}
              {comprehensive.nextBillingDate
                ? toDateInput(comprehensive.nextBillingDate)
                : "—"}
            </span>
            {canUpdateCiStatus ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending || comprehensive.billingStatus === "billed"}
                  onClick={() => handleCiStatus("billed", comprehensive.id)}
                >
                  請求済みにする
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    pending ||
                    comprehensive.billingStatus !== "billed" ||
                    comprehensive.paymentStatus === "paid"
                  }
                  onClick={() => handleCiStatus("paid", comprehensive.id)}
                >
                  入金済みにする
                </Button>
              </>
            ) : null}
          </div>
        ) : null}

        {history.length > 0 ? (
          <div className="overflow-x-auto rounded-md border text-sm">
            <table className="min-w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left">更新日</th>
                  <th className="px-3 py-2 text-left">加入</th>
                  <th className="px-3 py-2 text-left">請求</th>
                  <th className="px-3 py-2 text-left">入金</th>
                  <th className="px-3 py-2 text-left">次回請求日</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-3 py-2">
                      {item.updatedAt.toLocaleDateString("ja-JP")}
                    </td>
                    <td className="px-3 py-2">
                      {item.enrolled ? "加入" : "未加入"}
                    </td>
                    <td className="px-3 py-2">
                      {BILLING_STATUS_LABELS[item.billingStatus]}
                    </td>
                    <td className="px-3 py-2">
                      {PAYMENT_STATUS_LABELS[item.paymentStatus]}
                    </td>
                    <td className="px-3 py-2">
                      {toDateInput(item.nextBillingDate) || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </SubSection>
    </>
  );
}
