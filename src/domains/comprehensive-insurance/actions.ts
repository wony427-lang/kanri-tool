"use server";

import { revalidatePath } from "next/cache";

import { requirePermission, requireSession } from "@/shared/authorization/service";
import type { FacilityScopeParams } from "@/shared/authorization/facility-scope";
import type { FormActionResult } from "@/shared/ui/form/types";

import {
  getCurrentComprehensiveInsurance,
  listComprehensiveInsuranceHistory,
  listUnbilled,
  markBilled,
  markPaid,
  upsertComprehensiveInsurance,
} from "./service";

function formObject(formData: FormData): Record<string, string> {
  return Object.fromEntries(formData.entries()) as Record<string, string>;
}

export async function getComprehensiveInsuranceAction(residentId: string) {
  const session = await requireSession();
  const [current, history] = await Promise.all([
    getCurrentComprehensiveInsurance(residentId, session),
    listComprehensiveInsuranceHistory(residentId, session),
  ]);
  return { current, history };
}

export async function listUnbilledAction(params: FacilityScopeParams = {}) {
  const session = await requireSession();
  return listUnbilled(session, params);
}

export async function updateComprehensiveInsuranceAction(
  residentId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const session = await requirePermission("insurance:update");
  const result = await upsertComprehensiveInsurance(
    residentId,
    formObject(formData),
    session,
  );
  if (!result.ok) {
    if (result.error.name === "ValidationError") {
      return { ok: false, errors: { fields: result.error.fieldErrors } };
    }
    return { ok: false, errors: { form: result.error.message } };
  }
  revalidatePath(`/residents/${residentId}`);
  revalidatePath("/comprehensive-insurance/unbilled");
  return { ok: true };
}

export async function markBilledAction(
  recordId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await requirePermission("comprehensive_insurance:update_status");
  const result = await markBilled(recordId, session);
  if (!result.ok) {
    return { ok: false, message: result.error.message };
  }
  revalidatePath("/comprehensive-insurance/unbilled");
  revalidatePath(`/residents/${result.value.residentId}`);
  return { ok: true };
}

export async function markPaidAction(
  recordId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await requirePermission("comprehensive_insurance:update_status");
  const result = await markPaid(recordId, session);
  if (!result.ok) {
    return { ok: false, message: result.error.message };
  }
  revalidatePath("/comprehensive-insurance/unbilled");
  revalidatePath(`/residents/${result.value.residentId}`);
  return { ok: true };
}
