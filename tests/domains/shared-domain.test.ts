import { describe, expect, it } from "vitest";

import { calculateAge } from "@/shared/domain/age";

describe("calculateAge", () => {
  it("computes age from birth date", () => {
    expect(
      calculateAge(new Date("1950-06-15"), new Date("2026-05-24")),
    ).toBe(75);
  });
});

describe("facility schemas", () => {
  it("requires facility name", async () => {
    const { createFacilitySchema } = await import(
      "@/domains/facilities/schemas"
    );
    expect(createFacilitySchema.safeParse({ name: "" }).success).toBe(false);
    expect(createFacilitySchema.safeParse({ name: "第一ホーム" }).success).toBe(
      true,
    );
  });
});

describe("staff account schemas", () => {
  it("requires at least one facility", async () => {
    const { createStaffAccountSchema } = await import(
      "@/domains/staff-accounts/schemas"
    );
    const result = createStaffAccountSchema.safeParse({
      displayName: "職員",
      loginId: "staff01",
      email: "staff@example.com",
      password: "Password1!",
      role: "staff",
      facilityIds: [],
    });
    expect(result.success).toBe(false);
  });
});
