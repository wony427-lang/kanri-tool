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
    <div className="flex h-screen flex-col bg-background text-foreground">
      <AppHeader
        session={session}
        user={user}
        adminFacilities={adminFacilities}
      />
      <div className="flex min-h-0 flex-1">
        <Navigation session={session} />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 pb-4 pt-0 md:px-6 md:pb-6 md:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
