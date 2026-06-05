"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { PASSWORD_LENGTH } from "@/domains/auth/password-policy";
import { requireAdminOnly, requirePermission } from "@/shared/authorization/service";
import { getSession } from "@/shared/authorization/service";

import {
  completePasswordReset,
  exchangePasswordRecoveryCode,
  signIn,
  signOut,
  startPasswordReset,
} from "./service";

const signInSchema = z.object({
  loginId: z.string().trim().min(1, "従業員 ID を入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

const resetPasswordSchema = z.object({
  password: z
    .string()
    .length(PASSWORD_LENGTH, `新しいパスワードは${PASSWORD_LENGTH}文字で入力してください`),
  passwordConfirm: z
    .string()
    .length(PASSWORD_LENGTH, `確認用パスワードは${PASSWORD_LENGTH}文字で入力してください`),
});

async function getClientIp(): Promise<string | null> {
  const headerStore = await headers();
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip")
  );
}

export async function signInAction(
  _previous: unknown,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; errors: { form?: string; fields?: Record<string, string> } }> {
  const parsed = signInSchema.safeParse({
    loginId: formData.get("loginId"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fields = Object.fromEntries(
      parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
    );
    return { ok: false, errors: { fields } };
  }

  const result = await signIn({
    loginId: parsed.data.loginId,
    password: parsed.data.password,
    ip: await getClientIp(),
  });

  if (!result.ok) {
    return { ok: false, errors: { form: result.error.message } };
  }

  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  const session = await getSession();
  await signOut({ session, ip: await getClientIp() });
  redirect("/login");
}

export async function requestPasswordResetAction(input: {
  loginId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await requirePermission("password:reset_others");
  const result = await startPasswordReset({
    loginId: input.loginId,
    actorStaffAccountId: session.staffAccountId,
    ip: await getClientIp(),
  });

  if (!result.ok) {
    return { ok: false, message: result.error.message };
  }

  return { ok: true };
}

export async function verifyRecoveryTokenAction(input: {
  tokenHash: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = await exchangePasswordRecoveryCode({
    tokenHash: input.tokenHash,
    ip: await getClientIp(),
  });

  if (!result.ok) {
    return { ok: false, message: result.error.message };
  }

  return { ok: true };
}

export async function completePasswordResetAction(
  _previous: unknown,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; errors: { form?: string; fields?: Record<string, string> } }> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });

  if (!parsed.success) {
    const fields = Object.fromEntries(
      parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
    );
    return { ok: false, errors: { fields } };
  }

  if (parsed.data.password !== parsed.data.passwordConfirm) {
    return {
      ok: false,
      errors: { fields: { passwordConfirm: "パスワードが一致しません" } },
    };
  }

  const result = await completePasswordReset({
    password: parsed.data.password,
    ip: await getClientIp(),
  });

  if (!result.ok) {
    return { ok: false, errors: { form: result.error.message } };
  }

  redirect("/login");
}

export async function requireAdminSessionAction(): Promise<void> {
  await requireAdminOnly();
}
