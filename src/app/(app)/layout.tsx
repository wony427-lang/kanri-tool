import { redirect } from "next/navigation";
import { Suspense } from "react";

import { listAccessibleFacilitiesAction } from "@/domains/residents/actions";
import { loadSessionContext } from "@/shared/authorization/session-loader";
import { ToastProvider, ToastViewport } from "@/shared/ui/primitives";
import { getLayoutUserProfile } from "@/shared/auth/layout-session";
import { AppShell } from "@/shared/ui/layouts";
import { BoundaryLoading } from "@/shared/ui/layouts/BoundaryLoading";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await loadSessionContext();
  if (!session) {
    redirect("/login?reason=session_expired");
  }
  if (!session.isActive) {
    redirect("/login?reason=account_inactive");
  }
  const user = await getLayoutUserProfile(session);
  const adminFacilities =
    session.role === "admin" ? await listAccessibleFacilitiesAction() : [];

  return (
    <ToastProvider>
      <Suspense fallback={<BoundaryLoading />}>
        <AppShell session={session} user={user} adminFacilities={adminFacilities}>
          {children}
        </AppShell>
      </Suspense>
      <ToastViewport />
    </ToastProvider>
  );
}
