"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/shared/authorization/service";
import type { FormActionResult } from "@/shared/ui/form/types";

import {
  upsertEmergencyContacts,
  upsertMedicalCareInfo,
  upsertMedicalHistory,
} from "./service";
import {
  emergencyContactsSchema,
  medicalCareInfoSchema,
  medicalHistorySchema,
  zodFieldErrors,
} from "./schemas";

function parseContactSlot(formData: FormData, prefix: string) {
  return {
    name: String(formData.get(`${prefix}Name`) ?? ""),
    relationship: String(formData.get(`${prefix}Relationship`) ?? ""),
    address: String(formData.get(`${prefix}Address`) ?? ""),
    phone: String(formData.get(`${prefix}Phone`) ?? ""),
    mobile: String(formData.get(`${prefix}Mobile`) ?? ""),
  };
}

export async function updateMedicalCareAction(
  residentId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const session = await requirePermission("resident:update");
  const parsed = medicalCareInfoSchema.safeParse({
    medicalFacilityName: formData.get("medicalFacilityName") || undefined,
    primaryDoctor: formData.get("primaryDoctor") || undefined,
    emergencyHospital: formData.get("emergencyHospital") || undefined,
    emergencyHospital2: formData.get("emergencyHospital2") || undefined,
    careOffice: formData.get("careOffice") || undefined,
    careOfficePhone: formData.get("careOfficePhone") || undefined,
    careOfficeLicenseNo: formData.get("careOfficeLicenseNo") || undefined,
    careManagerName: formData.get("careManagerName") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, errors: { fields: zodFieldErrors(parsed.error) } };
  }

  const result = await upsertMedicalCareInfo(
    residentId,
    parsed.data,
    session,
  );

  if (!result.ok) {
    if (result.error.name === "ValidationError") {
      return { ok: false, errors: { fields: result.error.fieldErrors } };
    }
    return { ok: false, errors: { form: result.error.message } };
  }

  revalidatePath(`/residents/${residentId}`);
  return { ok: true };
}

export async function updateEmergencyContactsAction(
  residentId: string,
  formData: FormData,
): Promise<FormActionResult & { warnings?: string[] }> {
  const session = await requirePermission("resident:update");
  const parsed = emergencyContactsSchema.safeParse({
    contact1: parseContactSlot(formData, "contact1"),
    contact2: parseContactSlot(formData, "contact2"),
  });

  if (!parsed.success) {
    return { ok: false, errors: { fields: zodFieldErrors(parsed.error) } };
  }

  const result = await upsertEmergencyContacts(
    residentId,
    parsed.data,
    session,
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

  revalidatePath(`/residents/${residentId}`);
  return { ok: true, warnings: result.value.warnings };
}

export async function updateMedicalHistoryAction(
  residentId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const session = await requirePermission("resident:update");
  const parsed = medicalHistorySchema.safeParse({
    medicalHistory: formData.get("medicalHistory") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, errors: { fields: zodFieldErrors(parsed.error) } };
  }

  const result = await upsertMedicalHistory(residentId, parsed.data, session);

  if (!result.ok) {
    if (result.error.name === "ValidationError") {
      return { ok: false, errors: { fields: result.error.fieldErrors } };
    }
    return { ok: false, errors: { form: result.error.message } };
  }

  revalidatePath(`/residents/${residentId}`);
  return { ok: true };
}
