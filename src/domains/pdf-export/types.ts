import type { CareInsuranceDetail } from "@/domains/insurance/types";
import type { DisabilityWelfareDetail, MedicalInsuranceDetail, PublicExpenseDetail } from "@/domains/insurance/types";
import type { ResidentDetail } from "@/domains/residents/types";

export interface ResidentPdfData {
  resident: ResidentDetail;
  careInsurance: CareInsuranceDetail | null;
  medicalInsurance: MedicalInsuranceDetail | null;
  disability: DisabilityWelfareDetail | null;
  publicExpenses: PublicExpenseDetail[];
  exportedAt: Date;
  exportedBy: string;
}
