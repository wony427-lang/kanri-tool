"use server";

import { revalidatePath } from "next/cache";

import { requirePermission, requireSession } from "@/shared/authorization/service";
import type { FormActionResult } from "@/shared/ui/form/types";

import {
  addPublicExpense,
  getCareInsurance,
  getDisabilityWelfareInfo,
  getMedicalInsurance,
  listPublicExpenses,
  removePublicExpense,
  updatePublicExpense,
  upsertCareInsurance,
  upsertDisabilityWelfareInfo,
  upsertMedicalInsurance,
} from "./service";

function formObject(formData: FormData): Record<string, string> {
  return Object.fromEntries(formData.entries()) as Record<string, string>;
}

function revalidateResident(residentId: string) {
  revalidatePath(`/residents/${residentId}`);
}

export async function getInsuranceBundleAction(residentId: string) {
  const session = await requireSession();
  const [care, medical, disability, publicExpenses] = await Promise.all([
    getCareInsurance(residentId, session),
    getMedicalInsurance(residentId, session),
    getDisabilityWelfareInfo(residentId, session),
    listPublicExpenses(residentId, session),
  ]);
  return { care, medical, disability, publicExpenses };
}

export async function updateCareInsuranceAction(
  residentId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const session = await requirePermission("insurance:update");
  const result = await upsertCareInsurance(residentId, formObject(formData), session);
  if (!result.ok) {
    if (result.error.name === "ValidationError") {
      return { ok: false, errors: { fields: result.error.fieldErrors } };
    }
    return { ok: false, errors: { form: result.error.message } };
  }
  revalidateResident(residentId);
  return { ok: true };
}

export async function updateMedicalInsuranceAction(
  residentId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const session = await requirePermission("insurance:update");
  const result = await upsertMedicalInsurance(
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
  revalidateResident(residentId);
  return { ok: true };
}

export async function updateDisabilityWelfareAction(
  residentId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const session = await requirePermission("insurance:update");
  const result = await upsertDisabilityWelfareInfo(
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
  revalidateResident(residentId);
  return { ok: true };
}

export async function addPublicExpenseAction(
  residentId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const session = await requirePermission("insurance:update");
  const result = await addPublicExpense(residentId, formObject(formData), session);
  if (!result.ok) {
    if (result.error.name === "ValidationError") {
      return { ok: false, errors: { fields: result.error.fieldErrors } };
    }
    return { ok: false, errors: { form: result.error.message } };
  }
  revalidateResident(residentId);
  return { ok: true };
}

export async function updatePublicExpenseAction(
  residentId: string,
  expenseId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const session = await requirePermission("insurance:update");
  const result = await updatePublicExpense(expenseId, formObject(formData), session);
  if (!result.ok) {
    if (result.error.name === "ValidationError") {
      return { ok: false, errors: { fields: result.error.fieldErrors } };
    }
    return { ok: false, errors: { form: result.error.message } };
  }
  revalidateResident(residentId);
  return { ok: true };
}

export async function removePublicExpenseAction(
  residentId: string,
  expenseId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await requirePermission("insurance:update");
  const result = await removePublicExpense(expenseId, session);
  if (!result.ok) {
    return { ok: false, message: result.error.message };
  }
  revalidateResident(residentId);
  return { ok: true };
}
