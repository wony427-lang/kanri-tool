import { describe, expect, it } from "vitest";

import {
  careInsuranceSchema,
  disabilityWelfareSchema,
  publicExpenseSchema,
} from "@/domains/insurance/schemas";
import { comprehensiveInsuranceSchema } from "@/domains/comprehensive-insurance/schemas";

describe("careInsuranceSchema (task 8.1)", () => {
  it("rejects invalid insurer number digits", () => {
    const result = careInsuranceSchema.safeParse({
      insurerNo: "12345",
      periodStart: "2024-01-01",
      periodEnd: "2023-12-31",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid care insurance input", () => {
    const result = careInsuranceSchema.safeParse({
      insurerNo: "123456",
      insuredNo: "1234567890",
      periodStart: "2024-01-01",
      periodEnd: "2025-12-31",
      burdenRatio: 1,
    });
    expect(result.success).toBe(true);
  });
});

describe("disabilityWelfareSchema period validation via service (task 8.3)", () => {
  it("schema accepts valid recipient number", () => {
    const result = disabilityWelfareSchema.safeParse({
      recipientNo: "1234567890",
      periodStart: "2024-04-01",
      periodEnd: "2025-03-31",
    });
    expect(result.success).toBe(true);
  });
});

describe("publicExpenseSchema (task 8.4)", () => {
  it("requires kind", () => {
    expect(publicExpenseSchema.safeParse({ kind: "" }).success).toBe(false);
    expect(publicExpenseSchema.safeParse({ kind: "生活保護" }).success).toBe(
      true,
    );
  });
});

describe("comprehensiveInsuranceSchema (task 9.2)", () => {
  it("requires startDate when enrolled", () => {
    const result = comprehensiveInsuranceSchema.safeParse({
      enrolled: "true",
      insurerName: "テスト保険",
    });
    expect(result.success).toBe(false);
  });

  it("allows not enrolled without dates", () => {
    const result = comprehensiveInsuranceSchema.safeParse({
      enrolled: "false",
    });
    expect(result.success).toBe(true);
  });
});

describe("comprehensive insurance authorization (task 9.3)", () => {
  it("viewer cannot update comprehensive insurance status", async () => {
    const { isPermissionAllowed } = await import(
      "@/shared/authorization/policy"
    );
    expect(
      isPermissionAllowed("viewer", "comprehensive_insurance:update_status"),
    ).toBe(false);
    expect(
      isPermissionAllowed("staff", "comprehensive_insurance:update_status"),
    ).toBe(true);
  });
});

describe("expiration alert authorization (task 10.2)", () => {
  it("viewer cannot update alert status", async () => {
    const { isPermissionAllowed } = await import(
      "@/shared/authorization/policy"
    );
    expect(isPermissionAllowed("viewer", "alert:update_status")).toBe(false);
    expect(isPermissionAllowed("staff", "alert:update_status")).toBe(true);
  });
});

describe("insuranceEditHref (task 10.3)", () => {
  it("links to resident insurance anchor", async () => {
    const { insuranceEditHref } = await import(
      "@/domains/expiration-alerts/href"
    );
    expect(
      insuranceEditHref({
        residentId: "resident-1",
        insuranceKind: "medical",
      }),
    ).toBe("/residents/resident-1#medical-insurance");
  });
});
