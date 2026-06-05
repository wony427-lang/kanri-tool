import { z } from "zod";

export const createFacilitySchema = z.object({
  name: z.string().trim().min(1, "施設名を入力してください"),
});

export const updateFacilitySchema = z.object({
  name: z.string().trim().min(1, "施設名を入力してください"),
  isActive: z.boolean(),
});

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]),
  );
}
