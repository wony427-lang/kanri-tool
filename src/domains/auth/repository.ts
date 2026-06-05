import "server-only";

import { prisma } from "@/shared/db/prisma";
import { serverEnv } from "@/shared/config/env.server";

export async function recordLoginAttempt(input: {
  loginId: string;
  succeeded: boolean;
  ip: string | null;
}): Promise<void> {
  await prisma.loginAttempt.create({
    data: {
      loginId: input.loginId,
      succeeded: input.succeeded,
      ip: input.ip ?? undefined,
    },
  });
}

export async function getRecentLoginAttempts(loginId: string) {
  const since = new Date(
    Date.now() - serverEnv.LOGIN_LOCK_DURATION_MIN * 60 * 1000,
  );

  return prisma.loginAttempt.findMany({
    where: {
      loginId,
      attemptedAt: { gte: since },
    },
    orderBy: { attemptedAt: "desc" },
    select: {
      succeeded: true,
      attemptedAt: true,
    },
  });
}

export async function findStaffAccountByLoginId(loginId: string) {
  return prisma.staffAccount.findUnique({
    where: { loginId },
    include: {
      facilityAssignments: {
        select: { facilityId: true },
      },
    },
  });
}

export async function updateLastLoginAt(staffAccountId: string): Promise<void> {
  await prisma.staffAccount.update({
    where: { id: staffAccountId },
    data: { lastLoginAt: new Date() },
  });
}
