import type { ExpirationAlertItem, InsuranceAlertKind } from "./types";

export function insuranceEditHref(
  alert: Pick<ExpirationAlertItem, "residentId" | "insuranceKind">,
): string {
  const anchors: Record<InsuranceAlertKind, string> = {
    care: "#care-insurance",
    medical: "#medical-insurance",
    disability: "#disability-welfare",
    burden_ratio: "#care-insurance",
    public_expense: "#public-expense",
    comprehensive: "#comprehensive-insurance",
  };
  return `/residents/${alert.residentId}${anchors[alert.insuranceKind]}`;
}
