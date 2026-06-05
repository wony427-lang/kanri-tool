"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requirePermission } from "@/shared/authorization/service";
import type { FormActionResult } from "@/shared/ui/form/types";

import {
  createFacility,
  getFacilityById,
  listFacilities,
  updateFacility,
} from "./service";
import { zodFieldErrors } from "./schemas";
import { createFacilitySchema, updateFacilitySchema } from "./schemas";

async function getClientIp(): Promise<string | null> {
  const headerStore = await headers();
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip")
  );
}

export async function listFacilitiesAction() {
  const session = await requirePermission("facility:manage");
  return listFacilities(session);
}

export async function getFacilityAction(id: string) {
  const session = await requirePermission("facility:manage");
  const result = await getFacilityById(id, session);
  if (!result.ok) {
    return null;
  }
  return result.value;
}

export async function createFacilityAction(
  formData: FormData,
): Promise<FormActionResult> {
  const session = await requirePermission("facility:manage");
  const parsed = createFacilitySchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { ok: false, errors: { fields: zodFieldErrors(parsed.error) } };
  }

  const result = await createFacility(parsed.data, session, await getClientIp());
  if (!result.ok) {
    if (result.error.name === "ValidationError") {
      return {
        ok: false,
        errors: { fields: result.error.fieldErrors },
      };
    }
    return { ok: false, errors: { form: result.error.message } };
  }

  redirect(`/facilities/${result.value.id}`);
}

export async function updateFacilityAction(
  id: string,
  formData: FormData,
): Promise<FormActionResult> {
  const session = await requirePermission("facility:manage");
  const parsed = updateFacilitySchema.safeParse({
    name: formData.get("name"),
    isActive: formData.get("isActive") === "true",
  });

  if (!parsed.success) {
    return { ok: false, errors: { fields: zodFieldErrors(parsed.error) } };
  }

  const result = await updateFacility(
    id,
    parsed.data,
    session,
    await getClientIp(),
  );

  if (!result.ok) {
    if (result.error.name === "ValidationError") {
      return {
        ok: false,
        errors: { fields: result.error.fieldErrors },
      };
    }
    return { ok: false, errors: { form: result.error.message } };
  }

  redirect(`/facilities/${id}`);
}
