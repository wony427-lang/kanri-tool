import "server-only";

import { prisma } from "@/shared/db/prisma";

import type {
  StaffAccountDetail,
  StaffAccountRepository,
  StaffAccountSummary,
} from "./types";

function toSummary(row: {
  id: string;
  displayName: string;
  loginId: string;
  email: string;
  role: StaffAccountSummary["role"];
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  facilityAssignments: ReadonlyArray<{ facilityId: string }>;
}): StaffAccountSummary {
  return {
    id: row.id,
    displayName: row.displayName,
    loginId: row.loginId,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
    facilityIds: row.facilityAssignments.map((a) => a.facilityId),
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
  };
}

function toDetail(row: {
  id: string;
  authUserId: string;
  displayName: string;
  loginId: string;
  email: string;
  role: StaffAccountSummary["role"];
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  facilityAssignments: ReadonlyArray<{ facilityId: string }>;
}): StaffAccountDetail {
  return {
    ...toSummary(row),
    authUserId: row.authUserId,
  };
}

const includeAssignments = {
  facilityAssignments: { select: { facilityId: true } },
} as const;

export const staffAccountRepository: StaffAccountRepository = {
  async list() {
    const rows = await prisma.staffAccount.findMany({
      include: includeAssignments,
      orderBy: [{ isActive: "desc" }, { displayName: "asc" }],
    });
    return rows.map(toSummary);
  },

  async findById(id) {
    const row = await prisma.staffAccount.findUnique({
      where: { id },
      include: includeAssignments,
    });
    return row ? toDetail(row) : null;
  },

  async findByLoginId(loginId) {
    const row = await prisma.staffAccount.findUnique({
      where: { loginId },
      include: includeAssignments,
    });
    return row ? toDetail(row) : null;
  },

  async findByEmail(email) {
    const row = await prisma.staffAccount.findUnique({
      where: { email },
      include: includeAssignments,
    });
    return row ? toDetail(row) : null;
  },

  async countActiveAdmins(excludeId) {
    return prisma.staffAccount.count({
      where: {
        role: "admin",
        isActive: true,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  },

  async create(input) {
    const row = await prisma.staffAccount.create({
      data: {
        authUserId: input.authUserId,
        displayName: input.displayName,
        loginId: input.loginId,
        email: input.email,
        role: input.role,
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
        facilityAssignments: {
          create: input.facilityIds.map((facilityId) => ({ facilityId })),
        },
      },
      include: includeAssignments,
    });
    return toDetail(row);
  },

  async update(id, input) {
    const row = await prisma.$transaction(async (tx) => {
      await tx.staffAccountFacility.deleteMany({
        where: { staffAccountId: id },
      });

      return tx.staffAccount.update({
        where: { id },
        data: {
          displayName: input.displayName,
          email: input.email,
          role: input.role,
          isActive: input.isActive,
          updatedBy: input.updatedBy,
          facilityAssignments: {
            create: input.facilityIds.map((facilityId) => ({ facilityId })),
          },
        },
        include: includeAssignments,
      });
    });
    return toDetail(row);
  },
};
