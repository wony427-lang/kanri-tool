import { describe, expect, it } from "vitest";

import { ForbiddenError } from "@/shared/authorization/errors";
import { createFakeSession } from "@test/utils/fakeSession";
import {
  normalizeMoveOutDate,
  residentFormSchema,
  validateMoveOutDateConsistency,
} from "@/domains/residents/schemas";

describe("resident schemas (task 6.2)", () => {
  it("rejects non-katakana nameKana", () => {
    const result = residentFormSchema.safeParse({
      facilityId: "00000000-0000-4000-8000-000000000001",
      name: "山田太郎",
      nameKana: "やまだ",
      birthDate: "1950-01-01",
      gender: "男性",
      usageStatus: "active",
    });
    expect(result.success).toBe(false);
  });

  it("requires moveOutDate when usageStatus is discharged", () => {
    const errors = validateMoveOutDateConsistency({
      usageStatus: "discharged",
      moveOutDate: null,
    });
    expect(errors.moveOutDate).toBeTruthy();
  });

  it("clears moveOutDate when usageStatus is not discharged", () => {
    expect(
      normalizeMoveOutDate({
        usageStatus: "active",
        moveOutDate: new Date("2024-01-01"),
      }),
    ).toBeNull();
  });

  it("keeps moveOutDate when usageStatus is discharged", () => {
    const date = new Date("2024-06-01");
    expect(
      normalizeMoveOutDate({
        usageStatus: "discharged",
        moveOutDate: date,
      }),
    ).toEqual(date);
  });
});

describe("resident authorization helpers", () => {
  it("viewer cannot manage residents", async () => {
    const { canManageResidents } = await import("@/domains/residents/service");
    expect(canManageResidents(createFakeSession({ role: "viewer" }))).toBe(
      false,
    );
    expect(canManageResidents(createFakeSession({ role: "staff" }))).toBe(true);
  });
});

describe("facility service authorization (task 5.1)", () => {
  it("rejects non-admin for listFacilities", async () => {
    const { listFacilities } = await import("@/domains/facilities/service");
    await expect(
      listFacilities(createFakeSession({ role: "staff" })),
    ).rejects.toThrow(ForbiddenError);
  });
});

describe("staff account protection rules (task 5.2)", () => {
  it("rejects self-disable via updateStaffAccount", async () => {
    const { updateStaffAccount } = await import(
      "@/domains/staff-accounts/service"
    );
    const { staffAccountRepository } = await import(
      "@/domains/staff-accounts/repository"
    );
    const originalFindById = staffAccountRepository.findById;
    staffAccountRepository.findById = async () => ({
      id: "self-id",
      authUserId: "auth-self",
      displayName: "自分",
      loginId: "self",
      email: "self@example.com",
      role: "admin",
      isActive: true,
      facilityIds: ["00000000-0000-4000-8000-000000000001"],
      lastLoginAt: null,
      createdAt: new Date(),
    });

    const session = createFakeSession({
      role: "admin",
      staffAccountId: "self-id",
    });

    try {
      const result = await updateStaffAccount(
        "self-id",
        {
          displayName: "自分",
          email: "self@example.com",
          role: "admin",
          facilityIds: ["00000000-0000-4000-8000-000000000001"],
          isActive: false,
        },
        session,
        null,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("自身");
      }
    } finally {
      staffAccountRepository.findById = originalFindById;
    }
  });
});

describe("emergency contact rules (task 7.2)", () => {
  it("rejects clearing contact1 when contact2 exists", async () => {
    const { upsertEmergencyContacts } = await import(
      "@/domains/medical-care/service"
    );
    const session = createFakeSession({ role: "staff" });

    const { residentRepository } = await import(
      "@/domains/residents/repository"
    );
    const originalFindById = residentRepository.findById;
    residentRepository.findById = async () => ({
      id: "resident-1",
      facilityId: "facility-a",
      facilityName: "施設A",
      name: "テスト",
      nameKana: "テスト",
      birthDate: new Date("1950-01-01"),
      age: 75,
      gender: "男性",
      address: null,
      phone: null,
      mobile: null,
      moveInDate: null,
      moveOutDate: null,
      usageStatus: "active",
      medicalHistory: null,
      notes: null,
      medicalCare: null,
      emergencyContacts: [],
      careLevel: null,
    });

    try {
      const result = await upsertEmergencyContacts(
        "resident-1",
        {
          contact1: { name: "", phone: "", mobile: "" },
          contact2: { name: "連絡先2", phone: "03-1111-2222" },
        },
        session,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("緊急連絡先 1");
      }
    } finally {
      residentRepository.findById = originalFindById;
    }
  });
});
