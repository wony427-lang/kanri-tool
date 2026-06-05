import "server-only";

import { getCurrentUser } from "@/shared/auth/get-user";
import { prisma } from "@/shared/db/prisma";

import type { SessionContext } from "./types";

export async function loadSessionContext(): Promise<SessionContext | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const staffAccount = await prisma.staffAccount.findUnique({
    where: { authUserId: user.id },
    include: {
      facilityAssignments: {
        select: { facilityId: true },
      },
    },
  });

  if (!staffAccount) {
    return null;
  }

  return {
    userId: user.id,
    staffAccountId: staffAccount.id,
    role: staffAccount.role,
    facilityIds: staffAccount.facilityAssignments.map(
      (assignment) => assignment.facilityId,
    ),
    isActive: staffAccount.isActive,
  };
}
