import type { VendorType } from "@prisma/client";
import { z } from "zod";

const vendorTypeSchema = z.enum([
  "care_billing",
  "medical",
  "insurer",
  "meal",
  "home_nursing",
  "other",
]);

export const vendorKeyFormSchema = z.object({
  vendorType: vendorTypeSchema,
  vendorName: z.string().trim().min(1, "業者名を入力してください"),
  uniqueKey: z.string().trim().min(1, "ユニークキーを入力してください"),
  notes: z.string().optional(),
});

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]),
  );
}

export function isDuplicateVendorIdentity(
  existing: ReadonlyArray<{
    id: string;
    vendorType: VendorType;
    vendorName: string;
  }>,
  candidate: {
    vendorType: VendorType;
    vendorName: string;
    excludeId?: string;
  },
): boolean {
  const normalizedName = candidate.vendorName.trim();
  return existing.some(
    (row) =>
      row.id !== candidate.excludeId &&
      row.vendorType === candidate.vendorType &&
      row.vendorName.trim() === normalizedName,
  );
}
