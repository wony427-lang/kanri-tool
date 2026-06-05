"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requirePermission } from "@/shared/authorization/service";

import {
  createStaffAccount,
  getStaffAccountById,
  listStaffAccounts,
  requestStaffPasswordReset,
  updateStaffAccount,
} from "./service";
import {
  createStaffAccountSchema,
  parseFacilityIds,
  updateStaffAccountSchema,
  zodFieldErrors,
} from "./schemas";
import type { FormActionResult } from "@/shared/ui/form/types";

async function getClientIp(): Promise<string | null> {
  const headerStore = await headers();
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip")
  );
}

export async function listStaffAccountsAction() {
  const session = await requirePermission("staff_account:manage");
  return listStaffAccounts(session);
}

export async function getStaffAccountAction(id: string) {
  const session = await requirePermission("staff_account:manage");
  const result = await getStaffAccountById(id, session);
  return result.ok ? result.value : null;
}

export async function createStaffAccountAction(
  formData: FormData,
): Promise<FormActionResult> {
  const session = await requirePermission("staff_account:manage");
  const parsed = createStaffAccountSchema.safeParse({
    displayName: formData.get("displayName"),
    loginId: formData.get("loginId"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    facilityIds: parseFacilityIds(formData),
  });

  if (!parsed.success) {
    return { ok: false, errors: { fields: zodFieldErrors(parsed.error) } };
  }

  const result = await createStaffAccount(
    parsed.data,
    session,
    await getClientIp(),
  );

  if (!result.ok) {
    if (result.error.name === "ValidationError") {
      return {
        ok: false,
        errors: { fields: result.error.fieldErrors, form: result.error.message },
      };
    }
    return { ok: false, errors: { form: result.error.message } };
  }

  redirect(`/staff-accounts/${result.value.id}`);
}

export async function updateStaffAccountAction(
  id: string,
  formData: FormData,
): Promise<FormActionResult> {
  const session = await requirePermission("staff_account:manage");
  const parsed = updateStaffAccountSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    role: formData.get("role"),
    facilityIds: parseFacilityIds(formData),
    isActive: formData.get("isActive") === "true",
  });

  if (!parsed.success) {
    return { ok: false, errors: { fields: zodFieldErrors(parsed.error) } };
  }

  const result = await updateStaffAccount(
    id,
    parsed.data,
    session,
    await getClientIp(),
  );

  if (!result.ok) {
    if (result.error.name === "ValidationError") {
      return {
        ok: false,
        errors: { fields: result.error.fieldErrors, form: result.error.message },
      };
    }
    return { ok: false, errors: { form: result.error.message } };
  }

  redirect(`/staff-accounts/${id}`);
}

export async function requestStaffPasswordResetAction(
  staffAccountId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await requirePermission("password:reset_others");
  const result = await requestStaffPasswordReset(
    staffAccountId,
    session,
    await getClientIp(),
  );

  if (!result.ok) {
    return { ok: false, message: result.error.message };
  }

  return { ok: true };
}
