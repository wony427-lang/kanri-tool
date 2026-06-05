import type { Permission, Role } from "@/shared/authorization/types";

const ALL_PERMISSIONS: ReadonlyArray<Permission> = [
  "resident:read",
  "resident:update",
  "resident:delete",
  "resident:pdf_export",
  "insurance:update",
  "comprehensive_insurance:update_status",
  "alert:read",
  "alert:update_status",
  "staff_account:manage",
  "password:reset_others",
  "facility:manage",
  "audit_log:read",
];

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  admin: new Set(ALL_PERMISSIONS),
  staff: new Set([
    "resident:read",
    "resident:update",
    "resident:pdf_export",
    "insurance:update",
    "comprehensive_insurance:update_status",
    "alert:read",
    "alert:update_status",
  ]),
  viewer: new Set(["resident:read", "alert:read"]),
};

export function isPermissionAllowed(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function permissionsForRole(role: Role): ReadonlyArray<Permission> {
  return ALL_PERMISSIONS.filter((permission) => isPermissionAllowed(role, permission));
}

export { ALL_PERMISSIONS, ROLE_PERMISSIONS };
