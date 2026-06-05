import { describe, expect, it } from "vitest";

import { createFakeSession } from "@test/utils/fakeSession";
import { ForbiddenError } from "@/shared/authorization/errors";
import {
  canViewFacility,
  getAccessibleFacilityIds,
} from "@/shared/authorization/service";

describe("getAccessibleFacilityIds admin cross-facility (task 18.1)", () => {
  it("allows admin to filter by facilities outside assignment", () => {
    expect(
      getAccessibleFacilityIds(
        createFakeSession({
          role: "admin",
          facilityIds: ["assigned-a"],
        }),
        ["assigned-a", "other-b"],
      ),
    ).toEqual(["assigned-a", "other-b"]);
  });

  it("still rejects staff filters outside assignment", () => {
    expect(() =>
      getAccessibleFacilityIds(
        createFakeSession({
          role: "staff",
          facilityIds: ["assigned-a"],
        }),
        ["assigned-a", "other-b"],
      ),
    ).toThrow(ForbiddenError);
  });

  it("returns assigned facilities by default for admin", () => {
    expect(
      getAccessibleFacilityIds(
        createFakeSession({
          role: "admin",
          facilityIds: ["assigned-a", "assigned-b"],
        }),
      ),
    ).toEqual(["assigned-a", "assigned-b"]);
  });
});

describe("canViewFacility admin access (task 18.1)", () => {
  it("allows admin to view any facility", () => {
    const session = createFakeSession({
      role: "admin",
      facilityIds: ["assigned-a"],
    });
    expect(canViewFacility(session, "other-b")).toBe(true);
  });

  it("restricts staff to assigned facilities", () => {
    const session = createFakeSession({
      role: "staff",
      facilityIds: ["assigned-a"],
    });
    expect(canViewFacility(session, "assigned-a")).toBe(true);
    expect(canViewFacility(session, "other-b")).toBe(false);
  });
});
