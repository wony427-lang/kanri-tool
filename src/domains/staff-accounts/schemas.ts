import { z } from "zod";

import { PASSWORD_LENGTH } from "@/domains/auth/password-policy";

const roleSchema = z.enum(["admin", "staff", "viewer"]);

export const createStaffAccountSchema = z.object({
  displayName: z.string().trim().min(1, "表示名を入力してください"),
  loginId: z
    .string()
    .trim()
    .min(1, "従業員 ID を入力してください")
    .regex(/^[a-zA-Z0-9._-]+$/, "従業員 ID は英数字・._- のみ使用できます"),
  email: z.string().trim().email("有効なメールアドレスを入力してください"),
  password: z
    .string()
    .length(PASSWORD_LENGTH, `初期パスワードは${PASSWORD_LENGTH}文字で入力してください`),
  role: roleSchema,
  facilityIds: z.array(z.string().uuid()).min(1, "所属施設を1件以上選択してください"),
});

export const updateStaffAccountSchema = z.object({
  displayName: z.string().trim().min(1, "表示名を入力してください"),
  email: z.string().trim().email("有効なメールアドレスを入力してください"),
  role: roleSchema,
  facilityIds: z.array(z.string().uuid()).min(1, "所属施設を1件以上選択してください"),
  isActive: z.boolean(),
});

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]),
  );
}

export function parseFacilityIds(formData: FormData): string[] {
  return formData
    .getAll("facilityIds")
    .map((value) => String(value))
    .filter(Boolean);
}
