import type { AlertHandleStatus } from "@prisma/client";

import type { AlertBucket } from "@/shared/domain/date";

export type InsuranceAlertKind =
  | "care"
  | "medical"
  | "disability"
  | "burden_ratio"
  | "public_expense"
  | "comprehensive";

export interface ExpirationAlertItem {
  id: string;
  residentId: string;
  residentName: string;
  facilityId: string;
  facilityName: string;
  insuranceKind: InsuranceAlertKind;
  endDate: Date;
  remainingDays: number;
  bucket: AlertBucket;
  handleStatus: AlertHandleStatus;
}
