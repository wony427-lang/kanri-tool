import type { SessionContext } from "@/shared/authorization/types";
import type { LayoutUserProfile } from "@/shared/auth/layout-session";

import { AppHeader } from "./AppHeader";
import type { FacilityOption } from "./FacilityScopeSelect";
import { Navigation } from "./Navigation";

interface AppShellProps {
  session: SessionContext;
  user: LayoutUserProfile;
  adminFacilities?: ReadonlyArray<FacilityOption>;
  children: React.ReactNode;
}

export function AppShell({
  session,
  user,
  adminFacilities = [],
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-full flex-col bg-background text-foreground">
      <AppHeader
        session={session}
        user={user}
        adminFacilities={adminFacilities}
      />
      <div className="flex flex-1">
        <Navigation session={session} />
        <main className="flex-1 overflow-x-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
