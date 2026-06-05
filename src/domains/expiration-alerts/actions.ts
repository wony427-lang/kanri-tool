"use server";

import { revalidatePath } from "next/cache";

import { requirePermission, requireSession } from "@/shared/authorization/service";
import type { FacilityScopeParams } from "@/shared/authorization/facility-scope";
import type { AlertBucket } from "@/shared/domain/date";

import { listAlerts, updateAlertStatus } from "./service";
import type { InsuranceAlertKind } from "./types";

export async function listAlertsAction(
  params: {
    bucket?: AlertBucket;
    insuranceKind?: InsuranceAlertKind;
  } & FacilityScopeParams = {},
) {
  const session = await requireSession();
  return listAlerts(session, params);
}

export async function updateAlertStatusAction(input: {
  alertId: string;
  status: "not_handled" | "confirmed" | "contacted" | "renewed";
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await requirePermission("alert:update_status");
  const result = await updateAlertStatus(input.alertId, input.status, session);
  if (!result.ok) {
    return { ok: false, message: result.error.message };
  }
  revalidatePath("/insurance-alerts");
  revalidatePath("/dashboard");
  return { ok: true };
}
