import type { SessionContext } from "@/shared/authorization/types";
import { loadSessionContext } from "@/shared/authorization/session-loader";
import { prisma } from "@/shared/db/prisma";

export async function getLayoutSession(): Promise<SessionContext> {
  const session = await loadSessionContext();
  if (session) {
    return session;
  }

  return {
    userId: "",
    staffAccountId: "",
    role: "viewer",
    facilityIds: [],
    isActive: false,
  };
}

export interface LayoutUserProfile {
  displayName: string;
  facilityLabel: string;
}

export async function getLayoutUserProfile(
  session: SessionContext,
): Promise<LayoutUserProfile> {
  if (!session.staffAccountId) {
    return {
      displayName: "ゲスト",
      facilityLabel: "未所属",
    };
  }

  const staffAccount = await prisma.staffAccount.findUnique({
    where: { id: session.staffAccountId },
    select: { displayName: true },
  });

  const facilityLabel =
    session.facilityIds.length > 1
      ? `${session.facilityIds.length}施設`
      : session.facilityIds[0] ?? "未所属";

  return {
    displayName: staffAccount?.displayName ?? "職員",
    facilityLabel,
  };
}
