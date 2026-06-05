import { z } from "zod";

export const comprehensiveInsuranceSchema = z
  .object({
    enrolled: z.enum(["true", "false"]),
    insurerName: z.string().optional(),
    policyNo: z.string().optional(),
    joinedAt: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    annualPremium: z
      .union([z.literal(""), z.coerce.number()])
      .optional()
      .transform((value) => (value === "" || value === undefined ? null : value)),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.enrolled === "true") {
      if (!data.startDate?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "加入時は保険開始日を入力してください",
          path: ["startDate"],
        });
      }
    }
    if (data.annualPremium != null && data.annualPremium < 0) {
      ctx.addIssue({
        code: "custom",
        message: "年間保険料は0以上で入力してください",
        path: ["annualPremium"],
      });
    }
  });

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]),
  );
}
