import "server-only";

import { ForbiddenError, UnauthenticatedError } from "@/shared/authorization/errors";
import { isPermissionAllowed } from "@/shared/authorization/policy";
import { loadSessionContext } from "@/shared/authorization/session-loader";
import type { Permission, SessionContext } from "@/shared/authorization/types";

function assertActive(session: SessionContext): void {
  if (!session.isActive) {
    throw new ForbiddenError();
  }
}

export async function getSession(): Promise<SessionContext | null> {
  return loadSessionContext();
}

export async function requireSession(): Promise<SessionContext> {
  const session = await loadSessionContext();
  if (!session) {
    throw new UnauthenticatedError();
  }
  assertActive(session);
  return session;
}

export async function requirePermission(
  permission: Permission,
): Promise<SessionContext> {
  const session = await requireSession();
  if (!isPermissionAllowed(session.role, permission)) {
    throw new ForbiddenError();
  }
  return session;
}

export async function requireAdminOnly(): Promise<SessionContext> {
  const session = await requireSession();
  if (session.role !== "admin") {
    throw new ForbiddenError();
  }
  return session;
}

export function getAccessibleFacilityIds(
  session: SessionContext,
  requested?: ReadonlyArray<string>,
): ReadonlyArray<string> {
  assertActive(session);

  if (session.facilityIds.length === 0) {
    return [];
  }

  if (!requested || requested.length === 0) {
    if (session.facilityIds.length === 0) {
      return [];
    }
    return [...session.facilityIds];
  }

  if (session.role === "admin") {
    return [...requested];
  }

  const scoped = requested.filter((facilityId) =>
    session.facilityIds.includes(facilityId),
  );

  if (scoped.length !== requested.length) {
    throw new ForbiddenError();
  }

  return scoped;
}

export function canViewFacility(
  session: SessionContext,
  facilityId: string,
): boolean {
  if (!session.isActive) {
    return false;
  }
  if (session.role === "admin") {
    return true;
  }
  return session.facilityIds.includes(facilityId);
}
