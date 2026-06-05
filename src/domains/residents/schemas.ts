import { z } from "zod";

const katakanaRegex = /^[\u30A0-\u30FFー\s]+$/;
const usageStatusSchema = z.enum([
  "active",
  "discharged",
  "scheduled",
  "paused",
]);

export const residentFormSchema = z.object({
  facilityId: z.string().uuid("所属施設を選択してください"),
  name: z.string().trim().min(1, "利用者氏名を入力してください"),
  nameKana: z
    .string()
    .trim()
    .min(1, "フリガナを入力してください")
    .regex(katakanaRegex, "フリガナはカタカナで入力してください"),
  birthDate: z.string().min(1, "生年月日を入力してください"),
  gender: z.string().trim().min(1, "性別を入力してください"),
  address: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  moveInDate: z.string().optional(),
  moveOutDate: z.string().optional(),
  usageStatus: usageStatusSchema,
});

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]),
  );
}

export function parseOptionalDate(value: string | undefined): Date | null {
  if (!value?.trim()) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function validateMoveOutDateConsistency(input: {
  usageStatus: z.infer<typeof usageStatusSchema>;
  moveOutDate: Date | null;
}): Record<string, string> {
  if (input.usageStatus === "discharged" && !input.moveOutDate) {
    return { moveOutDate: "退去済みの場合は退去日を入力してください" };
  }
  return {};
}

export function normalizeMoveOutDate(input: {
  usageStatus: z.infer<typeof usageStatusSchema>;
  moveOutDate: Date | null;
}): Date | null {
  if (input.usageStatus === "discharged") {
    return input.moveOutDate;
  }
  return null;
}

export const residentSearchSchema = z.object({
  keyword: z.string().optional(),
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
    .optional(),
  facilityId: z.string().uuid().optional(),
  primaryDoctor: z.string().optional(),
  careManagerKeyword: z.string().optional(),
  usageStatus: usageStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortColumn: z
    .enum([
      "name",
      "birthDate",
      "age",
      "careLevel",
      "facilityName",
      "primaryDoctor",
      "careManagerName",
      "usageStatus",
    ])
    .default("name"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
});
