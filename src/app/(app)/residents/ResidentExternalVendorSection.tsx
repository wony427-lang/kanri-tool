import { listVendorKeysAction } from "@/domains/external-vendors/actions";
import { canManageResidents } from "@/domains/residents/service";
import type { SessionContext } from "@/shared/authorization/types";

import { ResidentExternalVendorForms } from "./ResidentExternalVendorForms";

export async function ResidentExternalVendorSection({
  residentId,
  session,
}: {
  residentId: string;
  session: SessionContext;
}) {
  const vendorKeys = await listVendorKeysAction(residentId);

  return (
    <ResidentExternalVendorForms
      residentId={residentId}
      vendorKeys={vendorKeys}
      canEdit={canManageResidents(session)}
    />
  );
}
