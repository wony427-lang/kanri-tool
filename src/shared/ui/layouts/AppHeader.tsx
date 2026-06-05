"use client";

import { signOutAction } from "@/domains/auth/actions";
import type { SessionContext } from "@/shared/authorization/types";
import type { LayoutUserProfile } from "@/shared/auth/layout-session";
import { Button } from "@/shared/ui/primitives/button";

import { FacilityScopeSelect, type FacilityOption } from "./FacilityScopeSelect";

interface AppHeaderProps {
  session: SessionContext;
  user: LayoutUserProfile;
  adminFacilities?: ReadonlyArray<FacilityOption>;
}

export function AppHeader({
  session,
  user,
  adminFacilities = [],
}: AppHeaderProps) {
  return (
    <header className="border-b border-muted-foreground/20 bg-background px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">kanri-tool</p>
          <p className="text-xs text-muted-foreground">利用者管理</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-foreground">
          <div className="text-right">
            <p className="font-medium">{user.displayName}</p>
            <p className="text-xs text-muted-foreground">{user.facilityLabel}</p>
          </div>

          {session.role === "admin" && adminFacilities.length > 0 ? (
            <FacilityScopeSelect facilities={adminFacilities} />
          ) : null}

          <form action={signOutAction}>
            <Button type="submit" variant="secondary">
              ログアウト
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
