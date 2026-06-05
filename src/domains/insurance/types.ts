import type { CareLevel } from "@prisma/client";

export interface CareInsuranceDetail {
  residentId: string;
  insurerNo: string | null;
  insuredNo: string | null;
  careLevel: CareLevel | null;
  certificationDate: Date | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  burdenRatio: number | null;
  burdenRatioExpiresAt: Date | null;
}

export interface MedicalInsuranceDetail {
  residentId: string;
  insurerNo: string | null;
  insuredNo: string | null;
  expiresAt: Date | null;
}

export interface DisabilityWelfareDetail {
  residentId: string;
  recipientNo: string | null;
  supportLevel: string | null;
  serviceType: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  serviceQuantity: string | null;
}

export interface PublicExpenseDetail {
  id: string;
  residentId: string;
  kind: string;
  payerNo: string | null;
  recipientNo: string | null;
  selfBurden: number | null;
  expiresAt: Date | null;
}
