import { z } from "zod";

const optionalDigits = (pattern: RegExp, message: string) =>
  z
    .string()
    .optional()
    .refine((value) => !value?.trim() || pattern.test(value.trim()), message);

export const careInsuranceSchema = z.object({
  insurerNo: optionalDigits(/^[0-9]{6}$/, "保険者番号は6桁の数字で入力してください"),
  insuredNo: optionalDigits(
    /^[0-9]{10}$/,
    "被保険者番号は10桁の数字で入力してください",
  ),
  careLevel: z
    .enum([
      "support1",
      "support2",
      "care1",
      "care2",
      "care3",
      "care4",
      "care5",
      "not_certified",
    ])
    .optional()
    .or(z.literal("")),
  certificationDate: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  burdenRatio: z
    .union([z.literal(""), z.coerce.number().int()])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value)),
  burdenRatioExpiresAt: z.string().optional(),
});

export const medicalInsuranceSchema = z.object({
  insurerNo: optionalDigits(
    /^[0-9]{6,8}$/,
    "保険者番号は6〜8桁の数字で入力してください",
  ),
  insuredNo: z.string().optional(),
  expiresAt: z.string().optional(),
});

export const disabilityWelfareSchema = z.object({
  recipientNo: optionalDigits(
    /^[0-9]{10}$/,
    "受給者証番号は10桁の数字で入力してください",
  ),
  supportLevel: z.string().optional(),
  serviceType: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  serviceQuantity: z.string().optional(),
});

export const publicExpenseSchema = z.object({
  kind: z.string().trim().min(1, "公費種別を入力してください"),
  payerNo: optionalDigits(/^[0-9]{8}$/, "負担者番号は8桁の数字で入力してください"),
  recipientNo: optionalDigits(
    /^[0-9]{7}$/,
    "受給者番号は7桁の数字で入力してください",
  ),
  selfBurden: z
    .union([z.literal(""), z.coerce.number()])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value)),
  expiresAt: z.string().optional(),
});

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]),
  );
}

export function normalizeOptionalString(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
