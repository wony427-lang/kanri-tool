import type { BillingStatus, PaymentStatus } from "@prisma/client";

export interface ComprehensiveInsuranceDetail {
  id: string;
  residentId: string;
  enrolled: boolean;
  insurerName: string | null;
  policyNo: string | null;
  joinedAt: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  annualPremium: number | null;
  nextBillingDate: Date | null;
  billingStatus: BillingStatus;
  paymentStatus: PaymentStatus;
  notes: string | null;
}

export interface ComprehensiveInsuranceHistoryItem {
  id: string;
  enrolled: boolean;
  insurerName: string | null;
  policyNo: string | null;
  joinedAt: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  annualPremium: number | null;
  nextBillingDate: Date | null;
  billingStatus: BillingStatus;
  paymentStatus: PaymentStatus;
  updatedAt: Date;
}

export interface UnbilledItem {
  recordId: string;
  residentId: string;
  residentName: string;
  facilityId: string;
  facilityName: string;
  nextBillingDate: Date;
  annualPremium: number | null;
  billingStatus: BillingStatus;
  paymentStatus: PaymentStatus;
}
