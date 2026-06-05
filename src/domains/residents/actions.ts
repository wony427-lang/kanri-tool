"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requirePermission, requireSession } from "@/shared/authorization/service";
import type { FormActionResult } from "@/shared/ui/form/types";

import {
  createResident,
  deleteResident,
  getResidentById,
  searchResidents,
  updateResident,
} from "./service";
import {
  residentFormSchema,
  residentSearchSchema,
  zodFieldErrors,
} from "./schemas";
import type { ResidentSearchQuery } from "./types";

async function getClientIp(): Promise<string | null> {
  const headerStore = await headers();
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip")
  );
}

export async function searchResidentsAction(
  formData: FormData,
): Promise<{
  items: Awaited<ReturnType<typeof searchResidents>>["items"];
  total: number;
}> {
  const session = await requireSession();
  const parsed = residentSearchSchema.safeParse({
    keyword: formData.get("keyword") || undefined,
    careLevel: formData.get("careLevel") || undefined,
    facilityId: formData.get("facilityId") || undefined,
    primaryDoctor: formData.get("primaryDoctor") || undefined,
    careManagerKeyword: formData.get("careManagerKeyword") || undefined,
    usageStatus: formData.get("usageStatus") || undefined,
    page: formData.get("page") || 1,
    pageSize: formData.get("pageSize") || 20,
    sortColumn: formData.get("sortColumn") || "name",
    sortDirection: formData.get("sortDirection") || "asc",
  });

  const params = parsed.success
    ? parsed.data
    : residentSearchSchema.parse({});

  const query: ResidentSearchQuery = {
    keyword: params.keyword,
    careLevel: params.careLevel,
    facilityId: params.facilityId,
    primaryDoctor: params.primaryDoctor,
    careManagerKeyword: params.careManagerKeyword,
    usageStatus: params.usageStatus,
    pagination: {
      offset: (params.page - 1) * params.pageSize,
      limit: params.pageSize,
    },
    sort: {
      column: params.sortColumn,
      direction: params.sortDirection,
    },
  };

  return searchResidents(query, session);
}

export async function getResidentAction(id: string) {
  const session = await requireSession();
  const result = await getResidentById(id, session);
  return result.ok ? result.value : null;
}

export async function createResidentAction(
  formData: FormData,
): Promise<FormActionResult> {
  const session = await requirePermission("resident:update");
  const parsed = residentFormSchema.safeParse({
    facilityId: formData.get("facilityId"),
    name: formData.get("name"),
    nameKana: formData.get("nameKana"),
    birthDate: formData.get("birthDate"),
    gender: formData.get("gender"),
    address: formData.get("address") || undefined,
    phone: formData.get("phone") || undefined,
    mobile: formData.get("mobile") || undefined,
    moveInDate: formData.get("moveInDate") || undefined,
    moveOutDate: formData.get("moveOutDate") || undefined,
    usageStatus: formData.get("usageStatus"),
  });

  if (!parsed.success) {
    return { ok: false, errors: { fields: zodFieldErrors(parsed.error) } };
  }

  const result = await createResident(parsed.data, session, await getClientIp());
  if (!result.ok) {
    if (result.error.name === "ValidationError") {
      return {
        ok: false,
        errors: { fields: result.error.fieldErrors, form: result.error.message },
      };
    }
    return { ok: false, errors: { form: result.error.message } };
  }

  redirect(`/residents/${result.value.id}`);
}

export async function updateResidentAction(
  id: string,
  formData: FormData,
): Promise<FormActionResult> {
  const session = await requirePermission("resident:update");
  const parsed = residentFormSchema.safeParse({
    facilityId: formData.get("facilityId"),
    name: formData.get("name"),
    nameKana: formData.get("nameKana"),
    birthDate: formData.get("birthDate"),
    gender: formData.get("gender"),
    address: formData.get("address") || undefined,
    phone: formData.get("phone") || undefined,
    mobile: formData.get("mobile") || undefined,
    moveInDate: formData.get("moveInDate") || undefined,
    moveOutDate: formData.get("moveOutDate") || undefined,
    usageStatus: formData.get("usageStatus"),
  });

  if (!parsed.success) {
    return { ok: false, errors: { fields: zodFieldErrors(parsed.error) } };
  }

  const result = await updateResident(id, parsed.data, session, await getClientIp());
  if (!result.ok) {
    if (result.error.name === "ValidationError") {
      return {
        ok: false,
        errors: { fields: result.error.fieldErrors, form: result.error.message },
      };
    }
    return { ok: false, errors: { form: result.error.message } };
  }

  redirect(`/residents/${id}`);
}

export async function deleteResidentAction(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await requirePermission("resident:delete");
  const result = await deleteResident(id, session, await getClientIp());

  if (!result.ok) {
    return { ok: false, message: result.error.message };
  }

  redirect("/residents");
}

export async function listAccessibleFacilitiesAction() {
  await requireSession();
  const { prisma } = await import("@/shared/db/prisma");

  return prisma.facility.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
