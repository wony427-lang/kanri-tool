"use server";

import { revalidatePath } from "next/cache";

import { requirePermission, requireSession } from "@/shared/authorization/service";
import type { FormActionResult } from "@/shared/ui/form/types";

import {
  addVendorKey,
  deleteVendorKey,
  listVendorKeys,
  updateVendorKey,
} from "./service";

import type { VendorKeyInput } from "./types";

function formObject(formData: FormData): Record<string, string> {
  return Object.fromEntries(formData.entries()) as Record<string, string>;
}

function toVendorKeyInput(raw: Record<string, string>): VendorKeyInput {
  return {
    vendorType: raw.vendorType as VendorKeyInput["vendorType"],
    vendorName: raw.vendorName ?? "",
    uniqueKey: raw.uniqueKey ?? "",
    notes: raw.notes,
  };
}

export async function listVendorKeysAction(residentId: string) {
  const session = await requireSession();
  return listVendorKeys(residentId, session);
}

export async function addVendorKeyAction(
  residentId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const session = await requirePermission("resident:update");
  const result = await addVendorKey(residentId, toVendorKeyInput(formObject(formData)), session);
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
  return { ok: true };
}

export async function updateVendorKeyAction(
  residentId: string,
  vendorKeyId: string,
  formData: FormData,
): Promise<FormActionResult> {
  const session = await requirePermission("resident:update");
  const result = await updateVendorKey(vendorKeyId, toVendorKeyInput(formObject(formData)), session);
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
  return { ok: true };
}

export async function deleteVendorKeyAction(
  residentId: string,
  vendorKeyId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await requirePermission("resident:update");
  const result = await deleteVendorKey(vendorKeyId, session);
  if (!result.ok) {
    return { ok: false, message: result.error.message };
  }
  revalidatePath(`/residents/${residentId}`);
  return { ok: true };
}
