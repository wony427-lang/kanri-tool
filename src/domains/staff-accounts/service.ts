import "server-only";

import type { SessionContext } from "@/shared/authorization/types";
import { ForbiddenError } from "@/shared/authorization/errors";
import { isPermissionAllowed } from "@/shared/authorization/policy";
import { NotFoundError, ValidationError } from "@/shared/domain/errors";
import { err, ok, type Result } from "@/shared/domain/result";
import { prisma } from "@/shared/db/prisma";
import { createSupabaseAdminClient } from "@/shared/supabase/admin";

import {
  PASSWORD_POLICY_MESSAGE,
  validatePasswordStrength,
} from "@/domains/auth/password-policy";
import { startPasswordReset } from "@/domains/auth/service";

import { staffAccountRepository } from "./repository";
import {
  createStaffAccountSchema,
  updateStaffAccountSchema,
  zodFieldErrors,
} from "./schemas";
import type {
  CreateStaffAccountInput,
  StaffAccountDetail,
  StaffAccountSummary,
  UpdateStaffAccountInput,
} from "./types";

function assertStaffManage(session: SessionContext): void {
  if (
    !session.isActive ||
    !isPermissionAllowed(session.role, "staff_account:manage")
  ) {
    throw new ForbiddenError();
  }
}

async function invalidateUserSessions(authUserId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.auth.admin.signOut(authUserId, "global");
}

export async function listStaffAccounts(
  session: SessionContext,
): Promise<StaffAccountSummary[]> {
  assertStaffManage(session);
  return staffAccountRepository.list();
}

export async function getStaffAccountById(
  id: string,
  session: SessionContext,
): Promise<Result<StaffAccountDetail, NotFoundError | ForbiddenError>> {
  assertStaffManage(session);
  const account = await staffAccountRepository.findById(id);
  if (!account) {
    return err(new NotFoundError("職員アカウントが見つかりません"));
  }
  return ok(account);
}

export async function createStaffAccount(
  input: CreateStaffAccountInput,
  session: SessionContext,
  ip: string | null,
): Promise<Result<StaffAccountDetail, ValidationError | ForbiddenError>> {
  assertStaffManage(session);

  const parsed = createStaffAccountSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      new ValidationError("入力内容に誤りがあります", zodFieldErrors(parsed.error)),
    );
  }

  if (!validatePasswordStrength(parsed.data.password)) {
    return err(
      new ValidationError("入力内容に誤りがあります", {
        password: PASSWORD_POLICY_MESSAGE,
      }),
    );
  }

  const [existingLoginId, existingEmail] = await Promise.all([
    staffAccountRepository.findByLoginId(parsed.data.loginId),
    staffAccountRepository.findByEmail(parsed.data.email),
  ]);

  const fieldErrors: Record<string, string> = {};
  if (existingLoginId) {
    fieldErrors.loginId = "この従業員 ID は既に使用されています";
  }
  if (existingEmail) {
    fieldErrors.email = "このメールアドレスは既に使用されています";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return err(new ValidationError("入力内容に誤りがあります", fieldErrors));
  }

  const admin = createSupabaseAdminClient();
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { login_id: parsed.data.loginId },
    });

  if (authError || !authData.user) {
    return err(
      new ValidationError("アカウントの作成に失敗しました", {
        form: "認証ユーザーの作成に失敗しました",
      }),
    );
  }

  try {
    const account = await prisma.$transaction(async (tx) => {
      const created = await tx.staffAccount.create({
        data: {
          authUserId: authData.user!.id,
          displayName: parsed.data.displayName,
          loginId: parsed.data.loginId,
          email: parsed.data.email,
          role: parsed.data.role,
          createdBy: session.staffAccountId,
          updatedBy: session.staffAccountId,
          facilityAssignments: {
            create: parsed.data.facilityIds.map((facilityId) => ({
              facilityId,
            })),
          },
        },
        include: {
          facilityAssignments: { select: { facilityId: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          kind: "staff_account_created",
          actorStaffAccountId: session.staffAccountId,
          targetType: "staff_account",
          targetId: created.id,
          ip: ip ?? undefined,
          metadata: { role: created.role },
        },
      });

      return created;
    });

    return ok({
      id: account.id,
      authUserId: account.authUserId,
      displayName: account.displayName,
      loginId: account.loginId,
      email: account.email,
      role: account.role,
      isActive: account.isActive,
      facilityIds: account.facilityAssignments.map((a) => a.facilityId),
      lastLoginAt: account.lastLoginAt,
      createdAt: account.createdAt,
    });
  } catch (error) {
    await admin.auth.admin.deleteUser(authData.user.id);
    throw error;
  }
}

export async function updateStaffAccount(
  id: string,
  input: UpdateStaffAccountInput,
  session: SessionContext,
  ip: string | null,
): Promise<
  Result<StaffAccountDetail, ValidationError | NotFoundError | ForbiddenError>
> {
  assertStaffManage(session);

  const parsed = updateStaffAccountSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      new ValidationError("入力内容に誤りがあります", zodFieldErrors(parsed.error)),
    );
  }

  const existing = await staffAccountRepository.findById(id);
  if (!existing) {
    return err(new NotFoundError("職員アカウントが見つかりません"));
  }

  if (id === session.staffAccountId && !parsed.data.isActive) {
    return err(
      new ValidationError("自身のアカウントは停止できません", {
        isActive: "自身のアカウントは停止できません",
      }),
    );
  }

  if (
    existing.role === "admin" &&
    existing.isActive &&
    (!parsed.data.isActive || parsed.data.role !== "admin")
  ) {
    const remainingAdmins = await staffAccountRepository.countActiveAdmins(id);
    if (remainingAdmins === 0) {
      return err(
        new ValidationError("最後の有効管理者は停止・降格できません", {
          isActive: "最後の有効管理者は停止・降格できません",
        }),
      );
    }
  }

  if (parsed.data.email !== existing.email) {
    const emailTaken = await staffAccountRepository.findByEmail(parsed.data.email);
    if (emailTaken && emailTaken.id !== id) {
      return err(
        new ValidationError("入力内容に誤りがあります", {
          email: "このメールアドレスは既に使用されています",
        }),
      );
    }
  }

  const wasActive = existing.isActive;
  const account = await prisma.$transaction(async (tx) => {
    await tx.staffAccountFacility.deleteMany({ where: { staffAccountId: id } });

    const updated = await tx.staffAccount.update({
      where: { id },
      data: {
        displayName: parsed.data.displayName,
        email: parsed.data.email,
        role: parsed.data.role,
        isActive: parsed.data.isActive,
        updatedBy: session.staffAccountId,
        facilityAssignments: {
          create: parsed.data.facilityIds.map((facilityId) => ({ facilityId })),
        },
      },
      include: {
        facilityAssignments: { select: { facilityId: true } },
      },
    });

    await tx.auditLog.create({
      data: {
        kind: parsed.data.isActive
          ? "staff_account_updated"
          : "staff_account_disabled",
        actorStaffAccountId: session.staffAccountId,
        targetType: "staff_account",
        targetId: updated.id,
        ip: ip ?? undefined,
        metadata: {
          role: updated.role,
          isActive: updated.isActive,
        },
      },
    });

    return updated;
  });

  if (parsed.data.email !== existing.email) {
    const admin = createSupabaseAdminClient();
    await admin.auth.admin.updateUserById(existing.authUserId, {
      email: parsed.data.email,
    });
  }

  if (wasActive && !parsed.data.isActive) {
    await invalidateUserSessions(existing.authUserId);
  }

  return ok({
    id: account.id,
    authUserId: account.authUserId,
    displayName: account.displayName,
    loginId: account.loginId,
    email: account.email,
    role: account.role,
    isActive: account.isActive,
    facilityIds: account.facilityAssignments.map((a) => a.facilityId),
    lastLoginAt: account.lastLoginAt,
    createdAt: account.createdAt,
  });
}

export async function requestStaffPasswordReset(
  staffAccountId: string,
  session: SessionContext,
  ip: string | null,
): Promise<Result<void, NotFoundError | ForbiddenError>> {
  assertStaffManage(session);

  const account = await staffAccountRepository.findById(staffAccountId);
  if (!account) {
    return err(new NotFoundError("職員アカウントが見つかりません"));
  }

  const result = await startPasswordReset({
    loginId: account.loginId,
    actorStaffAccountId: session.staffAccountId,
    ip,
  });

  if (!result.ok) {
    return err(new NotFoundError(result.error.message));
  }

  return ok(undefined);
}
