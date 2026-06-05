import { getComprehensiveInsuranceAction } from "@/domains/comprehensive-insurance/actions";
import { getInsuranceBundleAction } from "@/domains/insurance/actions";
import {
  canManageResidents,
} from "@/domains/residents/service";
import { isPermissionAllowed } from "@/shared/authorization/policy";
import type { SessionContext } from "@/shared/authorization/types";

import { ResidentInsuranceForms } from "./ResidentInsuranceForms";

export async function ResidentInsuranceSections({
  residentId,
  session,
}: {
  residentId: string;
  session: SessionContext;
}) {
  const canEdit = canManageResidents(session);
  const canUpdateCiStatus = isPermissionAllowed(
    session.role,
    "comprehensive_insurance:update_status",
  );

  const [{ care, medical, disability, publicExpenses }, comprehensiveBundle] =
    await Promise.all([
      getInsuranceBundleAction(residentId),
      getComprehensiveInsuranceAction(residentId),
    ]);

  return (
    <ResidentInsuranceForms
      residentId={residentId}
      canEdit={canEdit}
      canUpdateCiStatus={canUpdateCiStatus}
      care={care}
      medical={medical}
      disability={disability}
      publicExpenses={publicExpenses}
      comprehensive={comprehensiveBundle.current}
      history={comprehensiveBundle.history}
    />
  );
}
