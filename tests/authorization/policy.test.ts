import { describe, expect, it } from "vitest";

import { createFakeSession } from "@test/utils/fakeSession";
import { ForbiddenError, UnauthenticatedError } from "@/shared/authorization/errors";
import {
  ALL_PERMISSIONS,
  isPermissionAllowed,
  permissionsForRole,
} from "@/shared/authorization/policy";
import { getAccessibleFacilityIds } from "@/shared/authorization/service";
import type { Role } from "@/shared/authorization/types";

describe("authorization policy (task 4.2)", () => {
  const roles: Role[] = ["admin", "staff", "viewer"];

  it.each(
    ALL_PERMISSIONS.flatMap((permission) =>
      roles.map((role) => ({ permission, role })),
    ),
  )("defines allow/deny for $role × $permission", ({ permission, role }) => {
    const allowed = isPermissionAllowed(role, permission);
    expect(typeof allowed).toBe("boolean");
  });

  it("allows admin to access all permissions", () => {
    expect(permissionsForRole("admin")).toEqual(ALL_PERMISSIONS);
  });

  it("denies viewer write permissions", () => {
    expect(isPermissionAllowed("viewer", "resident:update")).toBe(false);
    expect(isPermissionAllowed("viewer", "resident:pdf_export")).toBe(false);
    expect(isPermissionAllowed("staff", "staff_account:manage")).toBe(false);
  });
});

describe("authorization service helpers (task 4.2)", () => {
  it("rejects inactive sessions via getAccessibleFacilityIds", () => {
    expect(() =>
      getAccessibleFacilityIds(
        createFakeSession({ isActive: false, role: "admin" }),
      ),
    ).toThrow(ForbiddenError);
  });

  it("returns assigned facilities when no filter is requested", () => {
    expect(
      getAccessibleFacilityIds(
        createFakeSession({ facilityIds: ["a", "b"], role: "staff" }),
      ),
    ).toEqual(["a", "b"]);
  });

  it("rejects facility filters outside session scope for staff", () => {
    expect(() =>
      getAccessibleFacilityIds(createFakeSession({ facilityIds: ["a"], role: "staff" }), [
        "a",
        "b",
      ]),
    ).toThrow(ForbiddenError);
  });
});

describe("authorization errors", () => {
  it("uses stable error names", () => {
    expect(new UnauthenticatedError().name).toBe("UnauthenticatedError");
    expect(new ForbiddenError().name).toBe("ForbiddenError");
  });
});
