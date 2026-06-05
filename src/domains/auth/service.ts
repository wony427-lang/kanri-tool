import "server-only";

import type { SessionContext } from "@/shared/authorization/types";
import { writeAuditLog } from "@/shared/audit-log";
import { serverEnv } from "@/shared/config/env.server";
import { prisma } from "@/shared/db/prisma";
import { createSupabaseAdminClient } from "@/shared/supabase/admin";
import { createSupabaseServerClient } from "@/shared/supabase/server";

import {
  findStaffAccountByLoginId,
  getRecentLoginAttempts,
  recordLoginAttempt,
  updateLastLoginAt,
} from "./repository";
import {
  countRecentFailedAttempts,
  INVALID_CREDENTIALS_MESSAGE,
  isLoginLocked,
  remainingLockMinutes,
  PASSWORD_POLICY_MESSAGE,
  validatePasswordStrength,
} from "./password-policy";

export type AuthError =
  | { kind: "invalid_credentials"; message: string }
  | { kind: "locked"; remainingMinutes: number; message: string }
  | { kind: "password_too_weak"; message: string }
  | { kind: "reset_token_invalid"; message: string }
  | { kind: "internal"; message: string };

function toSessionContext(staffAccount: {
  authUserId: string;
  id: string;
  role: SessionContext["role"];
  isActive: boolean;
  facilityAssignments: ReadonlyArray<{ facilityId: string }>;
}): SessionContext {
  return {
    userId: staffAccount.authUserId,
    staffAccountId: staffAccount.id,
    role: staffAccount.role,
    facilityIds: staffAccount.facilityAssignments.map(
      (assignment) => assignment.facilityId,
    ),
    isActive: staffAccount.isActive,
  };
}

export async function signIn(input: {
  loginId: string;
  password: string;
  ip: string | null;
}): Promise<
  | { ok: true; session: SessionContext }
  | { ok: false; error: AuthError }
> {
  const now = new Date();
  const attempts = await getRecentLoginAttempts(input.loginId);
  const failedCount = countRecentFailedAttempts(
    attempts,
    now,
    serverEnv.LOGIN_LOCK_DURATION_MIN,
  );

  if (isLoginLocked(failedCount, serverEnv.LOGIN_LOCK_THRESHOLD)) {
    const oldestFailure = attempts.find((attempt) => !attempt.succeeded)?.attemptedAt ?? null;
    const remainingMinutes = remainingLockMinutes(
      oldestFailure,
      now,
      serverEnv.LOGIN_LOCK_DURATION_MIN,
    );

    await recordLoginAttempt({
      loginId: input.loginId,
      succeeded: false,
      ip: input.ip,
    });
    await writeAuditLog({
      kind: "login_locked",
      actorStaffAccountId: null,
      targetType: "auth",
      targetId: null,
      ip: input.ip,
      metadata: { loginId: input.loginId },
    });

    return {
      ok: false,
      error: {
        kind: "locked",
        remainingMinutes,
        message: `ログイン試行回数が上限に達しました。${remainingMinutes}分後に再度お試しください。`,
      },
    };
  }

  const staffAccount = await findStaffAccountByLoginId(input.loginId);
  const supabase = await createSupabaseServerClient();
  const email = staffAccount?.email ?? `${input.loginId}@invalid.local`;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  });

  if (error || !data.user || !staffAccount || !staffAccount.isActive) {
    await recordLoginAttempt({
      loginId: input.loginId,
      succeeded: false,
      ip: input.ip,
    });
    await writeAuditLog({
      kind: "login_failure",
      actorStaffAccountId: staffAccount?.id ?? null,
      targetType: "auth",
      targetId: staffAccount?.id ?? null,
      ip: input.ip,
      metadata: { loginId: input.loginId },
    });

    return {
      ok: false,
      error: {
        kind: "invalid_credentials",
        message: INVALID_CREDENTIALS_MESSAGE,
      },
    };
  }

  await recordLoginAttempt({
    loginId: input.loginId,
    succeeded: true,
    ip: input.ip,
  });
  await updateLastLoginAt(staffAccount.id);
  await writeAuditLog({
    kind: "login_success",
    actorStaffAccountId: staffAccount.id,
    targetType: "auth",
    targetId: staffAccount.id,
    ip: input.ip,
    metadata: {},
  });

  return {
    ok: true,
    session: toSessionContext(staffAccount),
  };
}

export async function signOut(input: {
  session: SessionContext | null;
  ip: string | null;
}): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  if (input.session) {
    await writeAuditLog({
      kind: "logout",
      actorStaffAccountId: input.session.staffAccountId,
      targetType: "auth",
      targetId: input.session.staffAccountId,
      ip: input.ip,
      metadata: {},
    });
  }
}

export async function startPasswordReset(input: {
  loginId: string;
  actorStaffAccountId: string;
  ip: string | null;
}): Promise<{ ok: true } | { ok: false; error: AuthError }> {
  const staffAccount = await findStaffAccountByLoginId(input.loginId);
  if (!staffAccount) {
    return {
      ok: true,
    };
  }

  const admin = createSupabaseAdminClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/reset-password`;
  const { error } = await admin.auth.resetPasswordForEmail(staffAccount.email, {
    redirectTo,
  });

  if (error) {
    return {
      ok: false,
      error: {
        kind: "internal",
        message: "パスワードリセットメールの送信に失敗しました",
      },
    };
  }

  await writeAuditLog({
    kind: "password_reset_requested",
    actorStaffAccountId: input.actorStaffAccountId,
    targetType: "staff_account",
    targetId: staffAccount.id,
    ip: input.ip,
    metadata: {},
  });

  return { ok: true };
}

export async function completePasswordReset(input: {
  password: string;
  ip: string | null;
}): Promise<{ ok: true } | { ok: false; error: AuthError }> {
  if (!validatePasswordStrength(input.password)) {
    return {
      ok: false,
      error: {
        kind: "password_too_weak",
        message: PASSWORD_POLICY_MESSAGE,
      },
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: {
        kind: "reset_token_invalid",
        message: "再設定 URL が無効または期限切れです",
      },
    };
  }

  const { error } = await supabase.auth.updateUser({ password: input.password });
  if (error) {
    return {
      ok: false,
      error: {
        kind: "reset_token_invalid",
        message: "再設定 URL が無効または期限切れです",
      },
    };
  }

  const staffAccount = await prisma.staffAccount.findUnique({
    where: { authUserId: user.id },
    select: { id: true },
  });

  await writeAuditLog({
    kind: "password_reset_completed",
    actorStaffAccountId: staffAccount?.id ?? null,
    targetType: "staff_account",
    targetId: staffAccount?.id ?? null,
    ip: input.ip,
    metadata: {},
  });

  await supabase.auth.signOut();
  return { ok: true };
}

export async function exchangePasswordRecoveryCode(input: {
  tokenHash: string;
  ip: string | null;
}): Promise<{ ok: true } | { ok: false; error: AuthError }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    type: "recovery",
    token_hash: input.tokenHash,
  });

  if (error) {
    return {
      ok: false,
      error: {
        kind: "reset_token_invalid",
        message: "再設定 URL が無効または期限切れです",
      },
    };
  }

  return { ok: true };
}
